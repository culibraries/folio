
import { Output, Resource } from "@pulumi/pulumi";
import { FolioModule } from "./classes/FolioModule";

import * as awsNative from "@pulumi/aws-native";
import * as util from "./util";

export module deploy {
    export function domain(
        name: string,
        modules: FolioModule[],
        vpcSecurityGroupId: Output<string>,
        subnetIds: Promise<Output<string>[]>,
        instanceType: string,
        instanceCount: number,
        dedicatedMasterType: string,
        dependsOn?: Resource[]): Output<string> | undefined {
        if (util.moduleExistsInList("mod-search", modules)) {
            const searchDomain = util.getStackSearchIdentifier();
            const domain: awsNative.opensearchservice.Domain = openSearchDomain(name,
                searchDomain,
                vpcSecurityGroupId,
                subnetIds,
                instanceType,
                instanceCount,
                dedicatedMasterType,
                dependsOn);
            return domain.domainEndpoint;
        }
        return undefined;
    }

    function openSearchDomain(
        name: string,
        domainName: string,
        vpcSecurityGroupId: Output<string>,
        subnetIds: Promise<Output<string>[]>,
        instanceType: string,
        instanceCount: number,
        dedicatedMasterType: string,
        dependsOn?: Resource[]): awsNative.opensearchservice.Domain {

        const domain = new awsNative.opensearchservice.Domain(name, {
            // https://docs.aws.amazon.com/opensearch-service/latest/developerguide/configuration-api.html#configuration-api-datatypes-domainname
            domainName: domainName,
            // https://docs.aws.amazon.com/opensearch-service/ latest/developerguide/what-is.html#choosing-version
            // This can also be ElasticSearch_X.Y.
            engineVersion: "OpenSearch_1.2",
            vPCOptions: {
                securityGroupIds: [vpcSecurityGroupId],
                subnetIds: subnetIds
            },
            // For these options see: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-opensearchservice-domain-clusterconfig.html
            // Trying to choose some sensible defaults here for opensearch while
            // making different size deployments configurable.
            // Pricing for instance types: https://aws.amazon.com/opensearch-service/pricing/
            // Instance types and storage sizes: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html
            // Note that t2 and t3 don't support Auto-Tune.
            clusterConfig: {
                instanceType: instanceType,
                instanceCount: instanceCount,
                dedicatedMasterEnabled: true, // Should "increase the stability of the cluster". See docs.
                dedicatedMasterCount: 1,
                dedicatedMasterType: dedicatedMasterType
            }
            // NOTE Not enabling zone awareness for now since it seems like it adds redundancy to avoid
            // downtime at the expense of complexity. This statement from the docs is worth considering:
            // "Don't enable zone awareness if your cluster has no replica index shards or is a single-node
            // cluster."
        }, {
            dependsOn: dependsOn
        });

        return domain;
    }
}
