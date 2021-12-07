import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

// TODO Use a chart from a URL rather than a repo so that the user doesn't need the chart on their local machine.

// Deploy PostgreSQL using a Helm chart.
export module deploy {
    export function helm(cluster: eks.Cluster, appNamespace: pulumi.Output<string>) {
        const instance = new k8s.helm.v3.Chart("postgresql",
            {
                namespace: appNamespace,
                repo: "bitnami",
                chart: "postgresql",
                // Chart version is 10.13.9 which installs PostgreSQL v11.14.0.
                version: "10.13.9",
                fetchOpts: { repo: "https://charts.bitnami.com/bitnami" },
            }, { provider: cluster.provider });
        return instance;
    }

    export function createDatabase(secret: k8s.core.v1.Secret, appNamespace: k8s.core.v1.Namespace) {
        return new k8s.batch.v1.Job("create-database", {
            metadata: {
                name: "create-database",
                namespace: appNamespace.id,
            },
            spec: {
                template: {
                    spec: {
                        containers: [{
                            name: "create-database",
                            image: "culibraries/create-database:0.16",
                            envFrom: [
                                { secretRef: { name: secret.metadata.name } }
                            ],
                        }],
                        restartPolicy: "Never",
                    },
                },
                backoffLimit: 3,
            },
        });
    }
}
