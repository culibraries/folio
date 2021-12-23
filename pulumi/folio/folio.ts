import * as pulumi from "@pulumi/pulumi";

import { FolioModule } from "./classes/FolioModule";
import { FolioDeployment } from "./classes/FolioDeployment";

import * as k8s from "@pulumi/kubernetes";
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
}

export module deploy {
    export function configMap(name: string,
        data: any, labels: any, fd: FolioDeployment,
        dependsOn?: Resource[]): k8s.core.v1.ConfigMap {
        return new k8s.core.v1.ConfigMap(name,
            {
                metadata: {
                    name: name,
                    labels: labels,
                    namespace: fd.namespace.id,
                },
                data: data
            },
            {
                provider: fd.cluster.provider,
                dependsOn: dependsOn
            });
    }

    export function secret(name: string,
        data: any,
        labels: any,
        fd: FolioDeployment,
        dependsOn?: Resource[]): k8s.core.v1.Secret {
        return new k8s.core.v1.Secret(name,
            {
                metadata: {
                    name: name,
                    labels: labels,
                    namespace: fd.namespace.id,
                },
                data: data,
            },
            {
                provider: fd.cluster.provider,
                dependsOn: dependsOn
            });
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

            const moduleRelease = deployModuleWithHelmChart(module, fd, values, [okapiRelease]);
            moduleReleases.push(moduleRelease);
        }

        return moduleReleases;
    }

    /**
     * Creates a superuser, applying all permissions, or only updates superuser's permissions
     * for a given deployment.
     *
     * If the deployment configuration file has a value of true for createSuperuser
     * this job will attempt to create that superuser. This should only be done if the
     * superuser does not yet exist. And it should only be done once for a deployment.
     * Attempting to create the superuser twice for a deployment will put the deployment
     * in an unstable state and mod-users-bl, mod-authtoken and mod-login-saml will have
     * to be redeployed if that mistake is made.
     *
     * This job will always update the superuser's permissions based on the modules
     * installed so it should be run with the value of createSuperuser: false anytime
     * a deployment's modules are changed.
     *
     * This function will attempt to set createSuperuser to false if it was true to
     * not let it run more than once.
     *
     * @param fd A reference to the current folio deployment object.
     * @param dependsOn All modules that have been deployed. These deployments need to complete
     * before running this since the modules need to be available to it.
     * @returns A reference to the job resource.
     */
    export function createOrUpdateSuperuser(
        superUserName: pulumi.Output<string>,
        superUserPassword: pulumi.Output<string>,
        fd: FolioDeployment,
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
            { name: "ADMIN_USER", value: pulumi.interpolate`${superUserName}` },
            { name: "ADMIN_PASSWORD", value: pulumi.interpolate`${superUserPassword}` },
            { name: "OKAPI_URL", value: fd.okapiUrl },
            { name: "TENANT_ID", value: fd.tenantId },
            { name: "FLAGS", value: flags},
        ];

        const jobName = "create-or-update-superuser";

        return new k8s.batch.v1.Job(jobName, {
            metadata: {
                name: jobName,
                namespace: fd.namespace.id,
            },

            spec: {
                template: {
                    spec: {
                        containers: [{
                            name: jobName,
                            image: `folioci/bootstrap-superuser`,
                            env: env,
                        }],
                        restartPolicy: "Never",
                    },
                },
                backoffLimit: 2
            }
        }, {
            dependsOn: dependsOn,

            deleteBeforeReplace: true
        });
    }

    /**
     * This registers the given modules with okapi for a folio deployment and tenant
     * in that deployment.
     * @param m The modules to register.
     * @param fd The folio deployment.
     * @param dependsOn The operations that must complete before this operation runs.
     * @returns A reference to the batch job.
     */
    export function moduleRegistration(modules: FolioModule[],
        fd: FolioDeployment,
        dependsOn?: Resource[]): k8s.batch.v1.Job[] {

        const registrationJobs: k8s.batch.v1.Job[] = [];

        for (const module of modules) {
            // We don't want to include okapi here since we're registering modules to it.
            if (module.name !== "okapi") {
                const registrationJob = registerModule(module, fd, dependsOn);
                registrationJobs.push(registrationJob);
            }
        }

        return registrationJobs;
    }

    function registerModule(m: FolioModule,
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

                // This job doesn't fail if some requests from the of the container script don't succeed
                // so retrying makes no difference here.
                backoffLimit: 1,
            }
        }, {
            dependsOn: dependsOn,

            deleteBeforeReplace: true
        });
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
            provider: fd.cluster.provider,

            // Hoping this will trigger pods to be replaced.
            // TODO Determine what the right thing to do here is.
            replaceOnChanges: ["*"],

            dependsOn: dependsOn
        });
    }
}
