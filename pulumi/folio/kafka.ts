import * as k8s from "@pulumi/kubernetes";

// Deploy Kafka using the Helm chart.
export module deployment {
    export function helm(kubeconfig: any, appsNamespaceName: string) {
        const provider = new k8s.Provider("provider", {
            kubeconfig: kubeconfig,
        });
        const instance = new k8s.helm.v3.Chart("kafka",
            {
                namespace: appsNamespaceName,
                chart: "bitnami/kafka",
                // Chart version is 14.4.1 which installs Kafka v2.8.1.
                // See https://github.com/bitnami/charts/blob/master/bitnami/kafka/Chart.yaml
                // where chart version is "version" and kafka version is "appVersion".
                version: "14.4.1",
                fetchOpts: { repo: "https://charts.bitnami.com/bitnami" },
                values: {
                    replicaCount: 3
                },
            },
        );
        return instance;
    }
}
