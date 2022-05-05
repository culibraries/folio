import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as awsNative from "@pulumi/aws-native";
import * as aws from "@pulumi/aws";
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
                    serverHost: args.domainUrl,
                    opensearchAccount: {
                        secret: args.secretArgs.name
                    }
                }
            }, {
            provider: args.cluster.provider,

            dependsOn: args.dependsOn
        });
        return release;
    }

    export function domain(args: SearchDomainArgs): aws.opensearch.Domain {
        var searchDomainName = util.getStackSearchIdentifier();
        var arn = args.awsAccountId.apply(accountId =>
            `arn:aws:es:${args.awsRegion}:${accountId}}:domain/${searchDomainName}/*`);
        var policyWithIpFilter =
            `{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": "es:*",
                    "Condition": {
                        "IpAddress": {
                            "aws:SourceIp": ["${args.clusterCidrBlock}"]
                        }
                    },
                    "Resource": "${arn}"
                }
            ]
        }`;
        var unrestrictedPolicy =
            `{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": "*"
                    },
                    "Action": [
                        "es:*"
                    ],
                    "Resource": "*"
                }
            ]
        }`;
        const example = new aws.opensearch.Domain(args.name, {
            tags: args.tags,
            domainName: util.getStackSearchIdentifier(),
            engineVersion: "OpenSearch_1.2",
            clusterConfig: {
                zoneAwarenessEnabled: true,
                zoneAwarenessConfig: {
                    availabilityZoneCount: 3
                },
                instanceType: args.instanceType,
                instanceCount: args.instanceCount
            },
            ebsOptions: {
                ebsEnabled: true,
                volumeSize: args.volumeSize, // In GB.
                volumeType: "gp2"
                // Docs here https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-volume-types.html don't wholly
                // apply. The actual calls to the service error out without one of these values:
                // gp2, io1, standard. io1 has tunable throughput so if we end up having performance issues on
                // data import, this may be a place to address that.
            },
            advancedSecurityOptions: {
                enabled: true,
                internalUserDatabaseEnabled: true,
                masterUserOptions: {
                    masterUserName: args.masterUserUsername,
                    masterUserPassword: args.masterUserPassword
                }
            },
            nodeToNodeEncryption: {
                enabled: true
            },
            encryptAtRest: {
                enabled: true
            },
            domainEndpointOptions: {
                enforceHttps: true,
                tlsSecurityPolicy: "Policy-Min-TLS-1-2-2019-07"
            },
            accessPolicies: policyWithIpFilter.replace(/(\r\n|\n|\r|\s)/gm, ""),
        }, {
            dependsOn: args.dependsOn
        });
        return example;
    }

    // The opensearchservice is defined here: https://www.pulumi.com/registry/packages/aws-native/api-docs/opensearchservice/
    export function awsNativeDomain(args: SearchDomainArgs):
        awsNative.opensearchservice.Domain {
        const searchDomainName = util.getStackSearchIdentifier();
        const domain = new awsNative.opensearchservice.Domain(args.name, {
            // https://docs.aws.amazon.com/opensearch-service/latest/developerguide/configuration-api.html#configuration-api-datatypes-domainname
            domainName: util.getStackSearchIdentifier(),
            // https://docs.aws.amazon.com/opensearch-service/latest/developerguide/what-is.html#choosing-version
            // This can also be ElasticSearch_X.Y.
            engineVersion: "OpenSearch_1.2",
            // vPCOptions: {
            //     securityGroupIds: [args.vpcSecurityGroupId],
            //     subnetIds: args.privateSubnetIds
            // },
            // For these options see: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-opensearchservice-domain-clusterconfig.html
            // Trying to choose some sensible defaults here for opensearch while
            // making different size deployments configurable.
            // Pricing for instance types: https://aws.amazon.com/opensearch-service/pricing/
            // Instance types and storage sizes: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html
            // Note that t2 and t3 don't support Auto-Tune.
            // FOLIO mod-search readme recommends m5.large for 7m records.
            clusterConfig: {
                zoneAwarenessEnabled: true,
                zoneAwarenessConfig: {
                    availabilityZoneCount: 3
                },
                instanceType: args.instanceType,
                instanceCount: args.instanceCount,
                // dedicatedMasterEnabled: true, // Should "increase the stability of the cluster". See docs.
                // dedicatedMasterCount: 2, // Needs to be greater than 1 for CloudFormation to let it through.
                // dedicatedMasterType: args.dedicatedMasterType
            },
            // For other options see: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-opensearchservice-domain-ebsoptions.html
            eBSOptions: {
                eBSEnabled: true,
                volumeSize: args.volumeSize, // In GB.
                volumeType: "gp2"
                // Docs here https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-volume-types.html don't wholly
                // apply. The actual calls to the service error out without one of these values:
                // gp2, io1, standard. io1 has tunable throughput so if we end up having performance issues on
                // data import, this may be a place to address that.
            },
            accessPolicies: {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            // "AWS": [
                            //     args.awsAccountId
                            // ]
                            "AWS": "*"
                        },
                        "Action": [
                            "es:*"
                        ],
                        "Condition": {
                            "IpAddress": {
                                "aws:SourceIp": [
                                    args.clusterCidrBlock
                                ]
                            }
                        },
                        // This constructs the domain ARN.
                        // "Resource": args.awsAccountId.apply(accountId =>
                        //     `arn:aws:es:${args.awsRegion}:${accountId}}:domain/${searchDomainName}/*`)
                        "Resource": "*"
                    }
                ]
            },
            advancedSecurityOptions: {
                enabled: true,
                internalUserDatabaseEnabled: true,
                masterUserOptions: {
                    masterUserName: args.masterUserUsername,
                    masterUserPassword: args.masterUserPassword
                }
            },
            nodeToNodeEncryptionOptions: {
                enabled: true
            },
            encryptionAtRestOptions: {
                enabled: true
            },
            domainEndpointOptions: {
                enforceHTTPS: true
            }
        }, {
            dependsOn: args.dependsOn,

            // NOTE This apparently does NOT force a delete/replace. The only way I'm able to delete/replace is
            // by commenting the resource in and out.
            deleteBeforeReplace: true,
        });

        return domain;
    }
}
