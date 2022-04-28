import * as k8s from "@pulumi/kubernetes";
import * as awsNative from "@pulumi/aws-native";
import * as util from "./util";

import { SearchDomainArgs } from "./interfaces/SearchDomainArgs";
import { SearchHelmChartArgs } from "./interfaces/SearchHelmChartArgs";

export module deploy {
    export function dashboardHelmChart(args: SearchHelmChartArgs) {
        const release = new k8s.helm.v3.Release(args.name,
            {
                namespace: args.namespace.id,
                name: "opensearch-dashboards",
                chart: "opensearch-dashboards",
                version: "1.4.1",
                repositoryOpts: { repo: "https://opensearch-project.github.io/helm-charts/" },
                values: {
                    opensearchHosts: args.domain,
                    opensearchAccount: {
                        secret: args.secretArgs.name,
                        keyPassphrase: {
                            enabled: false
                        }
                    }
                }
            }, {
            provider: args.cluster.provider,

            dependsOn: args.dependsOn
        });
        return release;
    }

    export function domain(args: SearchDomainArgs):
        awsNative.opensearchservice.Domain {
        const domain = new awsNative.opensearchservice.Domain(args.name, {
            // https://docs.aws.amazon.com/opensearch-service/latest/developerguide/configuration-api.html#configuration-api-datatypes-domainname
            domainName: util.getStackSearchIdentifier(),
            // https://docs.aws.amazon.com/opensearch-service/latest/developerguide/what-is.html#choosing-version
            // This can also be ElasticSearch_X.Y.
            engineVersion: "OpenSearch_1.2", 
            vPCOptions: {
                securityGroupIds: [args.vpcSecurityGroupId],
                subnetIds: args.subnetIds.splice(0, 1)
            },
            // For these options see: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-opensearchservice-domain-clusterconfig.html
            // Trying to choose some sensible defaults here for opensearch while
            // making different size deployments configurable.
            // Pricing for instance types: https://aws.amazon.com/opensearch-service/pricing/
            // Instance types and storage sizes: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html
            // Note that t2 and t3 don't support Auto-Tune.
            // FOLIO mod-search readme recommends m5.large for 7m records.
            clusterConfig: {
                instanceType: args.instanceType,
                instanceCount: args.instanceCount,
                // dedicatedMasterEnabled: true, // Should "increase the stability of the cluster". See docs.
                // dedicatedMasterCount: 1,
                // dedicatedMasterType: args.dedicatedMasterType
            },
            // For other options see: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-opensearchservice-domain-ebsoptions.html
            eBSOptions: {
                eBSEnabled: true,
                volumeSize: args.volumeSize, // In GB.
                volumeType: "gp2"
                // Docs here https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-volume-types.html don't wholly
                // apply. The actual calls to the service error out without one of these values:
                // gp2, io1, standard.
            }
            // NOTE Not enabling zone awareness for now since it seems like it adds redundancy to avoid
            // downtime at the expense of complexity. This statement from the docs is worth considering:
            // "Don't enable zone awareness if your cluster has no replica index shards or is a single-node
            // cluster."
        }, {
            dependsOn: args.dependsOn
        });

        return domain;
    }
}
