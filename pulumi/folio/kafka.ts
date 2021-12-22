import * as k8s from "@pulumi/kubernetes";
import { Resource } from "@pulumi/pulumi";
import { FolioDeployment } from "./classes/FolioDeployment";

// TODO Use a chart from a URL rather than a repo so that the user doesn't need the chart on their local machine.

// Deploy Kafka using the Helm chart.
export module deploy {
    export function helm(fd: FolioDeployment, dependsOn?: Resource[]) {
        const instance = new k8s.helm.v3.Chart("kafka",
            {
                namespace: fd.namespace.id,
                repo: "bitnami",
                chart: "kafka",
                // Chart version is 14.4.3 which installs Kafka v2.8.1.
                version: "14.4.3",
                fetchOpts: { repo: "https://charts.bitnami.com/bitnami" },
                // See other chart options here https://artifacthub.io/packages/helm/bitnami/kafka
                values: {
                    replicaCount: 3
                },
            }, {
                provider: fd.cluster.provider,
                dependsOn: dependsOn
            });
        return instance;
    }
}
