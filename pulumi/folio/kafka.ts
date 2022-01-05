import * as k8s from "@pulumi/kubernetes";
import * as eks from "@pulumi/eks";

import { Resource } from "@pulumi/pulumi";

// Deploy Kafka using the Helm chart.
export module deploy {
    export function helm(
        name: string,
        cluster: eks.Cluster,
        namespace: k8s.core.v1.Namespace,
        dependsOn?: Resource[]) {
        const instance = new k8s.helm.v3.Release(name,
            {
                namespace: namespace.id,
                name: name,
                chart: "kafka",
                // Chart version is 14.4.3 which installs Kafka v2.8.1.
                version: "14.4.3",
                repositoryOpts: { repo: "https://charts.bitnami.com/bitnami" },
                // See other chart options here https://artifacthub.io/packages/helm/bitnami/kafka
                values: {
                    replicaCount: 3
                },
            }, {
                provider: cluster.provider,
                dependsOn: dependsOn
            });
        return instance;
    }
}
