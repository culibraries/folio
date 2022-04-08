import * as k8s from "@pulumi/kubernetes";
import * as eks from "@pulumi/eks";

import { Resource } from "@pulumi/pulumi";

export module deploy {
    export function helm(
        name: string,
        cluster: eks.Cluster,
        awsRegion?: string,
        dependsOn?: Resource[]): k8s.helm.v3.Release {
        const release = new k8s.helm.v3.Release(name,
            {
                name: name,
                chart: "adot-exporter-for-eks-on-ec2",
                version: "0.3.1",
                repositoryOpts: { repo: "https://aws-observability.github.io/aws-otel-helm-charts" },
                values: {
                    clusterName: cluster.eksCluster.name,
                    awsRegion: awsRegion,
                    adotCollector: {
                        daemonSet: {
                            service: {
                                metrics: {
                                    receivers: ["awscontainerinsightreceiver"],
                                    exporters: ["awsemf"]
                                }
                            }
                        }
                    },
                    fluentBit: {
                        enabled: true
                    }
                }
            }, {
            provider: cluster.provider,
            dependsOn: dependsOn
        });
        return release;
    }
}
