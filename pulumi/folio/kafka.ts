import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

// TODO Use a chart from a URL rather than a repo so that the user doesn't need the chart on their local machine.

// Deploy Kafka using the Helm chart.
export module deployment {
    export function helm(cluster: eks.Cluster, appNamespace: pulumi.Output<string>) {
        const instance = new k8s.helm.v3.Chart("kafka",
            {
                namespace: appNamespace,
                repo: "bitnami",
                chart: "kafka",
                // Chart version is 14.4.3 which installs Kafka v2.8.1.
                version: "14.4.3",
                fetchOpts: { repo: "https://charts.bitnami.com/bitnami" },
                // See other chart options here https://artifacthub.io/packages/helm/bitnami/kafka
                values: {
                    replicaCount: 3
                },
            }, { provider: cluster.provider });
        return instance;
    }
}
