import { FolioModule } from "./classes/FolioModule";
import { FolioDeployment } from "./classes/FolioDeployment";

import * as k8s from "@pulumi/kubernetes";
import { Resource } from "@pulumi/pulumi";
import * as fs from 'fs';
import * as YAML from 'yaml';
import { core } from "@pulumi/kubernetes/types/enums";

export module prepare {
    /**
     * Prepare a list of folio modules which can be used to deploy.
     * @returns A list of FolioModule objects.
     */
    export function moduleList(fd: FolioDeployment): FolioModule[] {
        var folioModules: FolioModule[] = new Array<FolioModule>();

        const releaseModules = modulesForRelease(fd.releaseFilePath);
        console.log(`Got ${releaseModules.length} modules from file: ${fd.releaseFilePath}`);

        for (const module of releaseModules) {
            console.log(`Got module: ${module.id}`);

            const parsed = parseModuleNameAndId(module.id);

            const m = new FolioModule(parsed.name,
                parsed.version,
                true,
                fd.tenantId,
                fd.loadSampleData,
                fd.loadReferenceData,
                fd.okapiUrl,
                fd.containerRepository);
            folioModules.push(m);
        }

        return folioModules;
    }

    export function parseModuleNameAndId(moduleId: string): any {
        const versionStart = moduleId.lastIndexOf('-') + 1;
        const versionEnd = moduleId.length;
        const moduleVersion = moduleId.substring(versionStart, versionEnd);
        console.log(`Got module version: ${moduleVersion}`);

        const nameStart = 0;
        const nameEnd = moduleId.lastIndexOf('-');
        const moduleName = moduleId.substring(nameStart, nameEnd);
        console.log(`Got module name: ${moduleName}`);

        return { name: moduleName, version: moduleVersion };
    }

    export function modulesForRelease(releaseFile: string): Array<any> {
        const release  = fs.readFileSync(releaseFile, 'utf8');
        return YAML.parse(release);
    }
}

export module deploy {
    export function configMap(name: string, data: any, labels: any, fd: FolioDeployment): k8s.core.v1.ConfigMap {
        return new k8s.core.v1.ConfigMap(name,
            {
                metadata: {
                    name: name,
                    labels: labels,
                    namespace: fd.namespace.id,
                },
                data: data
            },
            { provider: fd.cluster.provider });
    }

    export function secret(name: string, data: any, labels: any, fd: FolioDeployment): k8s.core.v1.Secret {
        return new k8s.core.v1.Secret(name,
            {
                metadata: {
                    name: name,
                    labels: labels,
                    namespace: fd.namespace.id,
                },
                data: data,
            },
            { provider: fd.cluster.provider });
    }

    /**
     * Deploy okapi along with a LoadBalancer service to handle external traffic.
     * @param cluster A reference to the cluster.
     * @param appNamespace A reference to the app namespace.
     * @param dependsOn The resources that okapi depends on being live before deploying.
     * @returns A reference to the helm release object for this deployment.
     */
    export function okapi(module: FolioModule, fd: FolioDeployment, dependsOn: Resource[]): k8s.helm.v3.Release {
        const values = {
            // Get the image from the version associated with the release.
            image: {
                tag: module.version,
                repository: `${module.containerRepository}/${module.name}`
            },

            fullnameOverride: module.name,

            // TODO Turn this back on after figuring out how to secure it. It is known to work at port 80.
            // For how to enable SSL see https://aws.amazon.com/premiumsupport/knowledge-center/terminate-https-traffic-eks-acm/.
            // service: {
            //     type: "LoadBalancer",
            //     // TODO Will probably want to make this 443.
            //     port: 80,
            //     containerPort: 9130
            // },

            // The postJob takes care of registering the module with okapi and the tenant.
            postJob: setPostJob(module)
        }

        return deployModuleWithHelmChart(module, fd, values, dependsOn);
    }

    /**
     * Deploys the provided list of folio modules. This should be used for any module
     * that requires a ClusterIp type of service (so not okapi, and not an edge module).
     * @param toDeploy The modules to deploy.
     * @returns A list of the module resources.
     */
    export function modules(toDeploy: Array<FolioModule>,
        fd: FolioDeployment,
        okapiRelease:  k8s.helm.v3.Release): Resource[] {
        console.log("Removing okapi from list of modules since it should have already been deployed");
        toDeploy = toDeploy.filter(module => module.name !== "okapi");

        console.log(`Attempting to deploy ${toDeploy.length} modules`);

        const moduleReleases:Resource[] = [];

        for (const module of toDeploy) {
            const values = {
                // Get the image from the version associated with the release.
                image: {
                    tag: module.version,
                    repository: `${module.containerRepository}/${module.name}`
                },

                fullnameOverride: module.name,

                // The postJob takes care of registering the module with okapi and the tenant.
                postJob: setPostJob(module)
            }

            const moduleRelease = deployModuleWithHelmChart(module, fd, values, [ okapiRelease ]);
            moduleReleases.push(moduleRelease);
        }

        return moduleReleases;
    }

    /**
     * Creates the superuser for a given FOLIO deployment. This requires at minimum the following
     * modules: mod-authtoken, mod-users, mod-login, mod-permissions, mod-inventory-storage, mod-users-bl.
     * @param secret The secret which contains all of the environment variables that the container
     * requires. See https://github.com/folio-org/folio-helm/blob/master/docker/bootstrap-superuser/Dockerfile
     * for those environment variables.
     * @param appNamespace The namespace.
     * @param dependsOn All modules that have been deployed. These deployments need to complete
     * before running this since the modules need to be available to it.
     * @returns A reference to the job resource.
     */
    export function bootstrapSuperuser(secret: k8s.core.v1.Secret,
        appNamespace: k8s.core.v1.Namespace,
        dependsOn?: Resource[]) {
        return new k8s.batch.v1.Job("bootstrap-superuser", {
            metadata: {
                name: "bootstrap-superuser",
                namespace: appNamespace.id,
            },

            spec: {
                template: {
                    spec: {
                        containers: [{
                            name: "bootstrap-superuser",
                            image: "folioci/bootstrap-superuser",
                            envFrom: [
                                { secretRef: { name: secret.metadata.name } }
                            ],
                        }],
                        restartPolicy: "Never",
                    },
                },
                backoffLimit: 2
            }
        }, {
            dependsOn: dependsOn
        });
    }

    export function registerModule(m: FolioModule,
        fd: FolioDeployment,
        dependsOn?: Resource[]) {
        return new k8s.batch.v1.Job(`register-module-${m.name}`, {
            metadata: {
                name: `register-module-${m.name}`,
                namespace: fd.namespace.id
            },

            spec: {
                template: {
                    spec: {
                        containers: [{
                            name: `register-module-${m.name}`,
                            image: "folioci/folio-okapi-registration",
                            env: [
                                { name: "OKAPI_URL", value: m.okapiUrl },
                                { name: "MODULE_NAME", value: m.name },
                                { name: "MODULE_VERSION", value: m.version },
                                { name: "TENANT_ID", value: m.tenantId },
                                { name: "SAMPLE_DATA", value: `${m.loadReferenceData}` },
                                { name: "REF_DATA", value: `${m.loadSampleData}` }
                            ],
                        }],
                        restartPolicy: "Never",
                    },
                },
                backoffLimit: 1,
            }
        }, {
            dependsOn: dependsOn,

            deleteBeforeReplace: true
        });
    }

    function setPostJob(m: FolioModule) {
        return {
            enabled: m.enableModule,
            tenantId: m.tenantId,
            sampleData: m.loadSampleData,
            referenceData: m.loadReferenceData,
            okapiUrl: m.okapiUrl
        }
    }

    function deployModuleWithHelmChart(module: FolioModule,
        fd: FolioDeployment,
        values: object,
        dependsOn?: Resource[]): k8s.helm.v3.Release {
        return new k8s.helm.v3.Release(module.name, {
            namespace: fd.namespace.id,

            name: module.name,

            chart: module.name,

            repositoryOpts: {
                repo: "https://folio-org.github.io/folio-helm/",
            },

            values: values,

            // We don't specify the chart version. The latest chart version will be deployed.
            // https://www.pulumi.com/registry/packages/kubernetes/api-docs/helm/v3/chart/#version_nodejs
        }, {
            provider: fd.cluster.provider,

            // Hoping this will trigger pods to be replaced.
            // TODO Determine what the right thing to do here is.
            replaceOnChanges: ["*"],

            dependsOn: dependsOn
        });
    }
}
