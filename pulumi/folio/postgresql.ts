import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";

// TODO Use a chart from a URL rather than a repo so that the user doesn't need the chart on their local machine.

// Deploy Kafka using the Helm chart.
export module deployment {
    export function helm(cluster: eks.Cluster, appNamespace: k8s.core.v1.Namespace) {
        const instance = new k8s.helm.v3.Chart("postgresql",
            {
                namespace: appNamespace.id,
                repo: "bitnami",
                chart: "postgresql",
                // Chart version is 10.13.9 which installs PostgreSQL v11.14.0.
                version: "10.13.9",
                fetchOpts: { repo: "https://charts.bitnami.com/bitnami" }
            }, { provider: cluster.provider });
        return instance;
    }
}
