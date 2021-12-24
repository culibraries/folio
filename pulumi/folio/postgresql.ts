import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { Resource } from "@pulumi/pulumi";
import { FolioDeployment } from "./classes/FolioDeployment";

// TODO Use a chart from a URL rather than a repo so that the user doesn't need the chart on their local machine.

// Deploy PostgreSQL using a Helm chart.
export module deploy {
    export function helm(fd: FolioDeployment,
                         adminPassword: pulumi.Output<string>,
                         dependsOn?: Resource[]) {
        const instance = new k8s.helm.v3.Release("postgresql-in-cluster",
            {
                namespace: fd.namespace.id,
                name: "postgresql",
                chart: "postgresql",
                // Chart version is 10.13.9 which installs PostgreSQL v11.14.0.
                version: "10.13.9",
                repositoryOpts: { repo: "https://charts.bitnami.com/bitnami" },
                values: {
                    postgresqlPassword: adminPassword,
                    postgresqlMaxConnections: "500",
                    postgresqlPostgresConnectionLimit: "500",
                    postgresqlDbUserConnectionLimit: "500"
                }
            }, {
                provider: fd.cluster.provider,
                dependsOn: dependsOn
            });
        return instance;
    }

    export function inClusterDatabaseCreation(secret: k8s.core.v1.Secret,
        appNamespace: k8s.core.v1.Namespace,

        // See https://www.pulumi.com/registry/packages/kubernetes/api-docs/helm/v3/chart/#depend-on-a-chart-resource
        dependsOn?: Resource[]) {
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
                            image: "ghcr.io/culibraries/create_database:latest",
                            envFrom: [
                                { secretRef: { name: secret.metadata.name } }
                            ],
                        }],
                        restartPolicy: "Never",
                    },
                },
                backoffLimit: 2,
            },
        }, {
            dependsOn: dependsOn,

            customTimeouts: {
                create: "5m",
                delete: "5m",
                update: "5m"
            }
        });
    }

}
