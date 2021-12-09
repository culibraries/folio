import { FolioModule } from "./classes/FolioModule";
import * as k8s from "@pulumi/kubernetes";
import * as eks from "@pulumi/eks";
import { Resource } from "@pulumi/pulumi";
import * as fs from 'fs';

export module prepare {
    /**
     * Prepare a list of folio modules which can be used to deploy.
     * @returns A list of FolioModule objects.
     */
    export function moduleList(releaseFile: string): FolioModule[] {
        var folioModules: FolioModule[] = new Array<FolioModule>();

        const releaseModules = getModulesForRelease(releaseFile);
        console.log(`Got ${releaseModules.length} modules from file: ${releaseFile}`);

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

            const m = new FolioModule(moduleName, moduleVersion);
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
     * Deploy okapi along with a LoadBalancer service to handle external traffic.
     * @param cluster A reference to the cluster.
     * @param appNamespace A reference to the app namespace.
     * @returns A reference to the helm release object for this deployment.
     */
    export function okapi(module: FolioModule, cluster: eks.Cluster,
        appNamespace: k8s.core.v1.Namespace): k8s.helm.v3.Release {
        const values = {
            // Get the image from the version associated with the release.
            image: {
                tag: module.version,
                repository: `folioorg/${module.name}`
            },

            service: {
                type: "LoadBalancer",
                // TODO Will probably want to make this 443.
                port: 80,
                containerPort: 9130
            },

            // TODO This is known to not always work. So if modules aren't getting registered
            // with okapi this is likely the problem. The known workaround is to run this script from
            // this docker image:
            // https://github.com/folio-org/folio-helm/tree/master/docker/folio-okapi-registration
            postJob: {
                enabled: false
            }
        }

        return deployModuleWithHelmChart(module, cluster, appNamespace, values);
    }

    /**
     * Deploys the provided list of folio modules. This should be used for any module
     * that requires a ClusterIp type of service (so not okapi, and not an edge module).
     * @param toDeploy The modules to deploy.
     */
    export function modules(toDeploy: Array<FolioModule>,
        cluster: eks.Cluster,
        appNamespace: k8s.core.v1.Namespace,
        okapiRelease:  k8s.helm.v3.Release) {
        console.log("Removing okapi from list of modules since it should have already been deployed");
        toDeploy = toDeploy.filter(module => module.name !== "okapi");

        console.log(`Attempting to deploy ${toDeploy.length} modules`);

        for (const module of toDeploy) {
            const values = {
                // Get the image from the version associated with the release.
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

            const dependsOn:Resource[] = [ okapiRelease ];
            deployModuleWithHelmChart(module, cluster, appNamespace, values, dependsOn);
        }
    }

    function deployModuleWithHelmChart(module: FolioModule,
        cluster: eks.Cluster,
        appNamespace: k8s.core.v1.Namespace,
        values: object,
        dependsOn?: Resource[]): k8s.helm.v3.Release {
        return new k8s.helm.v3.Release(module.name, {
            namespace: appNamespace.id,
            chart: module.name,
            // We don't specify the version. The latest chart version will be deployed.
            // https://www.pulumi.com/registry/packages/kubernetes/api-docs/helm/v3/chart/#version_nodejs
            repositoryOpts: {
                repo: "https://folio-org.github.io/folio-helm/",
            },
            values: values

        }, {
            provider: cluster.provider,

            // Hoping this will trigger pods to be replaced.
            // TODO Determine what the right thing to do here is.
            replaceOnChanges: ["*"],

            dependsOn: dependsOn
        });
    }
}
