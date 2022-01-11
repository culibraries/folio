
import { FolioModule } from "./classes/FolioModule";
import { FolioDeployment } from "./classes/FolioDeployment";

import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

import * as input from "@pulumi/kubernetes/types/input";
import * as eks from "@pulumi/eks";
import { Resource } from "@pulumi/pulumi";

import * as fs from 'fs';
import * as YAML from 'yaml';

export module prepare {
    /**
     * Prepare a list of folio modules which can be used to deploy.
     * @returns A list of FolioModule objects.
     */
    export function moduleList(fd: FolioDeployment): FolioModule[] {
        var folioModules: FolioModule[] = new Array<FolioModule>();

        const releaseModules = modulesForRelease(fd.deploymentConfigurationFilePath);
        console.log(`Got ${releaseModules.length} modules from file: ${fd.deploymentConfigurationFilePath}`);

        for (const module of releaseModules) {
            console.log(`Got module: ${module}`);

            const parsed = parseModuleNameAndId(module);

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

    export function modulesForRelease(deploymentConfigFilePath: string): Array<any> {
        const release = fs.readFileSync(deploymentConfigFilePath, 'utf8');
        return YAML.parse(release).modules;
    }

    export function shouldCreateSuperuser(deploymentConfigFilePath: string): boolean {
        const release = fs.readFileSync(deploymentConfigFilePath, 'utf8');
        let parsed: any = YAML.parse(release);
        if (!parsed.hasOwnProperty("createSuperuser")) {
            throw new Error("Deployment configuration file has no property createSuperuser");
        }
        return parsed.createSuperuser;
    }

    export function setCreateSuperuser(setTo: boolean, deploymentConfigFilePath: string) {
        const release = fs.readFileSync(deploymentConfigFilePath, 'utf8');
        let parsed: any = YAML.parse(release);
        parsed.createSuperuser = setTo;

        fs.writeFileSync(deploymentConfigFilePath, YAML.stringify(parsed));
    }

    export function moduleRegistrationInitContainers(modules: FolioModule[]): input.core.v1.Container[] {

        var initContainers: input.core.v1.Container[] = [];

        for (const module of modules) {
            // We don't want to include okapi here since we're registering modules to it.
            if (module.name !== "okapi") {
                initContainers.push(createInitContainerForModule(module));
            }
        }

        return initContainers;
    }

    function createInitContainerForModule(m: FolioModule): input.core.v1.Container {
        return {
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
        };
    }
}

export module deploy {
    export function configMap(name: string,
        data: any, labels: any,
        cluster: eks.Cluster,
        namespace: k8s.core.v1.Namespace,
        dependsOn?: Resource[]): k8s.core.v1.ConfigMap {
        return new k8s.core.v1.ConfigMap(name,
            {
                metadata: {
                    name: name,
                    labels: labels,
                    namespace: namespace.id,
                },
                data: data
            },
            {
                provider: cluster.provider,
                dependsOn: dependsOn
            });
    }

    export function secret(name: string,
        data: any,
        labels: any,
        cluster: eks.Cluster,
        namespace: k8s.core.v1.Namespace,
        dependsOn?: Resource[]): k8s.core.v1.Secret {
        return new k8s.core.v1.Secret(name,
            {
                metadata: {
                    name: name,
                    labels: labels,
                    namespace: namespace.id,
                },
                data: data,
            },
            {
                provider: cluster.provider,
                dependsOn: dependsOn
            });
    }

    /**
     * Deploy okapi along with a LoadBalancer service to handle external traffic.
     * @param module The module object for okapi.
     * @param cluster A reference to the k8s cluster.
     * @param namespace A reference to the k8s namespace.
     * @param dependsOn The resources that okapi depends on being live before deploying.
     * @returns A reference to the helm release object for this deployment.
     */
    export function okapi(module: FolioModule, cluster: eks.Cluster,
        namespace: k8s.core.v1.Namespace, dependsOn: Resource[]): k8s.helm.v3.Release {
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

            // The postJob value in the folio-helm chart is very unreliable. We don't use it and
            // instead create our own job that runs after all modules have been installed.
            postJob: {
                enabled: false
            },

            resources: {
                limits: {
                    memory: module.limitsMemory
                },
                requests: {
                    memory: module.requestsMemory
                }
            }
        }

        return deployModuleWithHelmChart(module, cluster, namespace, values, dependsOn);
    }

    /**
     * Deploys the provided list of folio modules. This should be used for any module
     * that requires a ClusterIp type of service (so not okapi, and not an edge module).
     * @param cluster A reference to the k8s cluster.
     * @param namespace A reference to the k8s namespace.
     * @param toDeploy The modules to deploy.
     * @returns A list of the module resources.
     */
    export function modules(toDeploy: Array<FolioModule>,
        cluster: eks.Cluster,
        namespace: k8s.core.v1.Namespace,
        okapiRelease: k8s.helm.v3.Release): Resource[] {
        console.log("Removing okapi from list of modules since it should have already been deployed");
        toDeploy = toDeploy.filter(module => module.name !== "okapi");

        console.log(`Attempting to deploy ${toDeploy.length} modules`);

        const moduleReleases: Resource[] = [];

        for (const module of toDeploy) {
            const values = {
                // Get the image from the version associated with the release.
                image: {
                    tag: module.version,
                    repository: `${module.containerRepository}/${module.name}`
                },

                fullnameOverride: module.name,

                // The postJob value in the folio-helm chart is very unreliable. We don't use it and
                // instead create our own job that runs after all modules have been installed.
                postJob: {
                    enabled: false
                },

                resources: {
                    limits: {
                        memory: module.limitsMemory
                    },
                    requests: {
                        memory: module.requestsMemory
                    }
                }
            }

            const moduleRelease =
                deployModuleWithHelmChart(module, cluster, namespace, values, [okapiRelease]);
            moduleReleases.push(moduleRelease);
        }

        return moduleReleases;
    }

    /**
     * Registers modules for our tenant to okapi, and after each module registration runs
     * in sequence, creates a superuser, if one needs to be created, applying all permissions,
     * or if a superuser already exists, only updates superuser's permissions for the
     * modules are deployed. Whether or not to create the superuser or just update the
     * permissions is controlled by the createSuperuser property in the deployment
     * configuration yaml file.
     *
     * If the deployment configuration file has a value of true for createSuperuser
     * this job will attempt to create that superuser. This should only be done if the
     * superuser does not yet exist. And it should only be done once for a deployment.
     * Attempting to create the superuser twice for a deployment will put the deployment
     * in an unstable state and mod-users-bl, mod-authtoken and mod-login-saml will have
     * to be redeployed (removed and re-added) if that mistake is made. This can be done by
     * commenting these modules out of the config file, running pulumi up, and commenting
     * them in again and running pulumi up again.
     *
     * This job will always update the superuser's permissions based on the modules
     * installed so it should be run with the value of createSuperuser: false anytime
     * a deployment's modules are changed.
     *
     * Note: changing a module's version is not the kind of change this function can handle.
     * That's _upgrading a module_, and requires a different process. The only thing this script
     * can handle is telling okapi about a new module _added_ to the stack.
     *
     * @param name The name for the job.
     * @param superUserName The super user name.
     * @param superUserPassword The superuser password.
     * @param fd A reference to the current folio deployment object.
     * @param namespace A reference to the k8s namespace.
     * @param cluster A reference to the k8s cluster.
     * @param initContainers A list of container objects which must run successfully before
     * bootstrapping the superuser.
     * @param dependsOn All modules that have been deployed. These deployments need to complete
     * before running this since the modules need to be available to it.
     * @returns A reference to the job resource.
     */
    export function registerModulesAndBootstrapSuperuser(
        name: string,
        superUserName: pulumi.Output<string>,
        superUserPassword: pulumi.Output<string>,
        fd: FolioDeployment,
        namespace: k8s.core.v1.Namespace,
        cluster: eks.Cluster,
        initContainers: input.core.v1.Container[],
        dependsOn?: Resource[]) {

        const shouldCreateSuperuser: boolean =
            prepare.shouldCreateSuperuser(fd.deploymentConfigurationFilePath);
        console.log(`Deployment configuration file
            ${fd.deploymentConfigurationFilePath} says create superuser is ${shouldCreateSuperuser}`);

        // When FLAGS is empty the job will attempt to create the superuser.
        // This should only be done once for a deployment so be careful about manually
        // changing the value of createSuperuser in the deployment config file.
        // See https://github.com/folio-org/folio-helm/blob/master/docker/bootstrap-superuser
        // for how this all works.
        let flags = ""; // This will create the superuser.
        if (shouldCreateSuperuser === true) {
            console.log(`Will attempt to create superuser for deployment:
                ${fd.deploymentConfigurationFilePath}`);
        } else {
            console.log(`Not attempting to create superuser for deployment:
                ${fd.deploymentConfigurationFilePath}`);
            flags = "--onlyperms";
        }

        let env = [
            { name: "ADMIN_USER", value: superUserName },
            { name: "ADMIN_PASSWORD", value: superUserPassword },
            { name: "OKAPI_URL", value: fd.okapiUrl },
            { name: "TENANT_ID", value: fd.tenantId },
            { name: "FLAGS", value: flags },
        ];

        return new k8s.batch.v1.Job(name, {
            metadata: {
                name: name,
                namespace: namespace.id,
            },

            spec: {
                template: {
                    spec: {
                        // These jobs will run sequentially and before the bootstrap superuser job.
                        initContainers: initContainers,

                        // This is what runs at the end.
                        containers: [{
                            name: name,
                            image: `folioci/bootstrap-superuser`,
                            env: env,
                        }],

                        restartPolicy: "Never",
                    },
                },
                backoffLimit: 1
            }
        }, {
            provider: cluster.provider,

            dependsOn: dependsOn,

            deleteBeforeReplace: true
        });
    }

    function deployModuleWithHelmChart(module: FolioModule,
        cluster: eks.Cluster,
        namespace: k8s.core.v1.Namespace,
        values: object,
        dependsOn?: Resource[]): k8s.helm.v3.Release {
        return new k8s.helm.v3.Release(module.name, {
            namespace: namespace.id,

            name: module.name,

            chart: module.name,

            repositoryOpts: {
                repo: "https://folio-org.github.io/folio-helm/",
            },

            values: values,

            // This is the default, but bringing it to the surface here so that we know
            // about this feature of pulumi helm releases. This is a very good thing
            // as it lets us make other resources truly dependent on this release being
            // complete.
            skipAwait: false,

            // 10 minutes. The default is 5 minutes. After this time the helm release will
            // return as complete, so we have to be careful here to make sure we're waiting
            // long enough. This timeout is a backstop if something has gone wrong. Otherwise
            // pulumi knows how to wait for the release to be complete. See note on skipAwait
            // above.
            timeout: 600

            // We don't specify the chart version. The latest chart version will be deployed.
            // https://www.pulumi.com/registry/packages/kubernetes/api-docs/helm/v3/chart/#version_nodejs
        }, {
            provider: cluster.provider,

            // This allows for any changes to the module's helm-chart params to result in a replacing
            // change to the pod.
            deleteBeforeReplace: true,

            dependsOn: dependsOn
        });
    }
}
