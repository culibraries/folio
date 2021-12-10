import { FolioModule } from "./classes/FolioModule";
import { FolioDeployment } from "./classes/FolioDeployment";

import * as k8s from "@pulumi/kubernetes";
import { Resource } from "@pulumi/pulumi";
import * as fs from 'fs';

export module prepare {
    /**
     * Prepare a list of folio modules which can be used to deploy.
     * @returns A list of FolioModule objects.
     */
    export function moduleList(fd: FolioDeployment): FolioModule[] {
        var folioModules: FolioModule[] = new Array<FolioModule>();

        const releaseModules = getModulesForRelease(fd.releaseFilePath);
        console.log(`Got ${releaseModules.length} modules from file: ${fd.releaseFilePath}`);

        for (const module of releaseModules) {
            console.log(`Got module: ${module.id}`);

            const versionStart = module.id.lastIndexOf('-') + 1;
            const versionEnd = module.id.length;
            const moduleVersion = module.id.substring(versionStart, versionEnd);
            console.log(`Got module version: ${moduleVersion}`);

            const nameStart = 0;
            const nameEnd = module.id.lastIndexOf('-');
            const moduleName = module.id.substring(nameStart, nameEnd);
            console.log(`Got module name: ${moduleName}`);

            const m = new FolioModule(moduleName,
                moduleVersion,
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

    function getModulesForRelease(releaseFile: string): Array<any> {
        const release  = fs.readFileSync(releaseFile, 'utf8');
        return JSON.parse(release);
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
     * @returns A reference to the helm release object for this deployment.
     */
    export function okapi(module: FolioModule, fd: FolioDeployment): k8s.helm.v3.Release {
        const values = {
            // Get the image from the version associated with the release.
            image: {
                tag: module.version,
                repository: `${module.containerRepository}/${module.name}`
            },

            service: {
                type: "LoadBalancer",
                // TODO Will probably want to make this 443.
                port: 80,
                containerPort: 9130
            },

            // The postJob takes care of registering the module with okapi and the tenant.
            postJob: setPostJob(module)
        }

        return deployModuleWithHelmChart(module, fd, values);
    }

    /**
     * Deploys the provided list of folio modules. This should be used for any module
     * that requires a ClusterIp type of service (so not okapi, and not an edge module).
     * @param toDeploy The modules to deploy.
     */
    export function modules(toDeploy: Array<FolioModule>,
        fd: FolioDeployment,
        okapiRelease:  k8s.helm.v3.Release) {
        console.log("Removing okapi from list of modules since it should have already been deployed");
        toDeploy = toDeploy.filter(module => module.name !== "okapi");

        console.log(`Attempting to deploy ${toDeploy.length} modules`);

        for (const module of toDeploy) {
            const values = {
                // Get the image from the version associated with the release.
                image: {
                    tag: module.version,
                    repository: `${module.containerRepository}/${module.name}`
                },

                // The postJob takes care of registering the module with okapi and the tenant.
                postJob: setPostJob(module)
            }

            const dependsOn:Resource[] = [ okapiRelease ];
            deployModuleWithHelmChart(module, fd, values, dependsOn);
        }
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

            // TODO Does setting this fix the release being named "release-<random string>" which is causing post
            // job hooks to fail?
            // It does, but it is not enough. The pod itself also needs to be named without random suffix.
            // Getting "pods 'mod-authtoken not found'. Why does the post job care about the pod _name_?
            name: module.name,

            chart: module.name,
            // We don't specify the version. The latest chart version will be deployed.
            // https://www.pulumi.com/registry/packages/kubernetes/api-docs/helm/v3/chart/#version_nodejs
            repositoryOpts: {
                repo: "https://folio-org.github.io/folio-helm/",
            },

            values: values
        }, {
            provider: fd.cluster.provider,

            // Hoping this will trigger pods to be replaced.
            // TODO Determine what the right thing to do here is.
            replaceOnChanges: ["*"],

            dependsOn: dependsOn
        });
    }
}
