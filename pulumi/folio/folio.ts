import * as request from "superagent";
import { FolioModule } from "./classes/FolioModule";
import * as k8s from "@pulumi/kubernetes";
import * as eks from "@pulumi/eks";

export module prepare {
    /**
     * Prepare a list of folio modules which can be used to deploy.
     * @param moduleNames A list of module names to deploy.
     * @param release The release in the form of a "quarterly" release.
     * @returns A list of FolioModule objects.
     */
    export async function moduleList(moduleNames: Array<string>, release: string): Promise<FolioModule[]> {
        var folioModules: FolioModule[] = new Array<FolioModule>();
        console.log(`Attempting to prepare ${moduleNames.length} modules for deployment`);

        const releaseModules = await getModulesForRelease(release);
        console.log(`Got ${releaseModules.length} modules in platform-complete for ${release} release`);

        for (const moduleName of moduleNames) {
            console.log(`Trying to get module with the name: ${moduleName}`);
            const releaseModule = getModuleByNameFromRelease(moduleName, releaseModules);
            console.log(`Got module: ${releaseModule.id}`);
            const start = releaseModule.id.lastIndexOf('-') + 1;
            const end = releaseModule.id.length;
            var moduleVersion = releaseModule.id.substring(start, end);
            console.log(`Module version: ${moduleVersion}`);
            var m = new FolioModule(moduleName, moduleVersion);
            folioModules.push(m);
        }

        return folioModules;
    }

    async function getModulesForRelease(release: string): Promise<Array<any>> {
        var endpoint = `https://raw.githubusercontent.com/folio-org/platform-complete/${release}/install.json`;
        console.log(`Fetching folio module list from endpoint: ${endpoint}`);
        const response = await request.get(endpoint);
        if (response.statusCode == 200) {
            return JSON.parse(response.text);
        }
        throw new Error(`Unexpected response from github while getting modules for release: ${response.statusCode}`);
    }

    function getModuleByNameFromRelease(moduleName: string, releaseModules: Array<any>): any {
        for (const m of releaseModules) {
            if (m.id.startsWith(moduleName)) {
                return m;
            }
        }
        throw new Error(`No module found with the name: ${moduleName}`);
    }
}

export module deploy {
    export function configMap(name: string, data: any, labels: any, cluster: eks.Cluster,
        appNamespace: k8s.core.v1.Namespace): k8s.core.v1.ConfigMap {
        return new k8s.core.v1.ConfigMap(name,
            {
                metadata: {
                    name: name,
                    labels: labels,
                    namespace: appNamespace.id,
                },
                data: data
            },
            { provider: cluster.provider });
    }

    export function secret(name: string, data: any, labels: any, cluster: eks.Cluster,
        appNamespace: k8s.core.v1.Namespace): k8s.core.v1.Secret {
        return new k8s.core.v1.Secret(name,
            {
                metadata: {
                    name: name,
                    labels: labels,
                    namespace: appNamespace.id,
                },
                data: data,
            },
            { provider: cluster.provider });
    }

    /**
     * Deploys the provided list of folio modules.
     * @param toDeploy The modules to deploy.
     */
    export function modules(toDeploy: Array<FolioModule>,
        cluster: eks.Cluster,
        appNamespace: k8s.core.v1.Namespace) {
        console.log(`Attempting to deploy ${toDeploy.length} modules`);

        for (const module of toDeploy) {
            deployModuleWithHelmChart(module, cluster, appNamespace);
        }
    }

    function deployModuleWithHelmChart(module: FolioModule,
        cluster: eks.Cluster,
        appNamespace: k8s.core.v1.Namespace) {
        new k8s.helm.v3.Release(module.name, {
            namespace: appNamespace.id,
            chart: module.name,
            // We don't specify the version. The latest chart version will be deployed.
            // https://www.pulumi.com/registry/packages/kubernetes/api-docs/helm/v3/chart/#version_nodejs
            repositoryOpts: {
                repo: "https://folio-org.github.io/folio-helm/",
            },
            values: {
                image: {
                    tag: module.version,
                    repository: `folioorg/${module.name}`
                },
                // TODO This is known to not always work. So if modules aren't getting registered
                // with okapi this is likely the problem. The known workaround is to run this script from
                // this docker image:
                // https://github.com/folio-org/folio-helm/tree/master/docker/folio-okapi-registration
                postJob: {
                    enabled: false
                }
            }

        }, { provider: cluster.provider,

            // Hoping this will trigger pods to be replaced.
            replaceOnChanges: ["*"] });
    }
}
