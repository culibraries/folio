import * as pulumi from "@pulumi/pulumi";
import { Output, Resource } from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as eks from "@pulumi/eks";

// Deploy PostgreSQL using a Helm chart.
export module deploy {
    export function helm(name: string,
                         cluster: eks.Cluster,
                         namespace: k8s.core.v1.Namespace,
                         adminPassword: pulumi.Output<string>,
                         dependsOn?: Resource[]) {
        const instance = new k8s.helm.v3.Release(name,
            {
                namespace: namespace.id,
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
                provider: cluster.provider,
                dependsOn: dependsOn
            });
        return instance;
    }

    export function inClusterDatabaseCreation(
        name: string,
        namespace: k8s.core.v1.Namespace,

        pgAdminUser: Output<string>,
        pgAdminPassword: Output<string>,
        dbUsername: Output<string>,
        dbPassword: Output<string>,
        dbHost: Output<string>,
        dbDatabase: string,

        // See https://www.pulumi.com/registry/packages/kubernetes/api-docs/helm/v3/chart/#depend-on-a-chart-resource
        dependsOn?: Resource[]) {
        return new k8s.batch.v1.Job(name, {
            metadata: {
                name: name,
                namespace: namespace.id,
            },

            spec: {
                template: {
                    spec: {
                        containers: [{
                            name: "create-database",
                            image: "ghcr.io/culibraries/create_database:latest",
                            env: [
                                { name: "PG_ADMIN_USER", value: pgAdminUser},
                                { name: "PG_ADMIN_USER_PASSWORD", value: pgAdminPassword },
                                { name: "DB_USERNAME", value: dbUsername },
                                { name: "DB_PASSWORD", value: dbPassword },
                                { name: "DB_HOST", value: dbHost },
                                { name: "DB_DATABASE", value: dbDatabase }
                            ],
                        }],
                        restartPolicy: "Never",
                    },
                },
                backoffLimit: 5,
            },
        }, {
            dependsOn: dependsOn,

            deleteBeforeReplace: true,

            customTimeouts: {
                create: "5m",
                delete: "5m",
                update: "5m"
            }
        });
    }

}
