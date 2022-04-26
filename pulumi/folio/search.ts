
import { Output, Resource } from "@pulumi/pulumi";

import * as awsNative from "@pulumi/aws-native";

export module deploy {

    export function openSearchDomain(
        name: string,
        domainName: string,
        vpcSecurityGroupId: Output<string>,
        subnetIds: Output<string>[],
        dependsOn?: Resource[]): awsNative.opensearchservice.Domain {

        const domain = new awsNative.opensearchservice.Domain(name, {
            // https://docs.aws.amazon.com/opensearch-service/latest/developerguide/configuration-api.html#configuration-api-datatypes-domainname
            domainName: domainName,
            // https://docs.aws.amazon.com/opensearch-service/latest/developerguide/what-is.html#choosing-version
            // This can also be ElasticSearch_X.Y.
            engineVersion: "OpenSearch_1.2",
            vPCOptions: {
                securityGroupIds: [ vpcSecurityGroupId ],
                subnetIds: subnetIds
            }
        }, {
            dependsOn: dependsOn
        });

        return domain;
    }
}
