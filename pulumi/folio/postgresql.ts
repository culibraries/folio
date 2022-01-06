import * as pulumi from "@pulumi/pulumi";
import { Output, Resource } from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as eks from "@pulumi/eks";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

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

    export function inClusterDatabase(
        name: string,
        namespace: k8s.core.v1.Namespace,
        cluster: eks.Cluster,

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
            provider: cluster.provider,

            dependsOn: dependsOn,

            deleteBeforeReplace: true,

            customTimeouts: {
                create: "5m",
                delete: "5m",
                update: "5m"
            }
        });
    }

    // TODO Probably remove this. We need to use aws.rds.Cluster because that is Aurora. This
    // is non-Aurora.
    export function rdsInstance(name: string,
        cluster: eks.Cluster,

        pgAdminUser: Output<string>,
        pgAdminPassword: Output<string>,
        vpc: awsx.ec2.Vpc,
        sg: aws.ec2.SecurityGroup,
        availabilityZone: string,
        storageGB: number,
        instanceClass: string,

        dependsOn?: Resource[]): aws.rds.Instance {
            return new aws.rds.Instance(name, {
                engine: 'postgresql',
                username: pgAdminUser,
                password: pgAdminPassword,
                availabilityZone: availabilityZone,
                instanceClass: instanceClass,
                allocatedStorage: storageGB,
                deletionProtection: true,
                engineVersion: "12",
                // TODO It is unknown how to get these. See:
                // Could be this https://www.pulumi.com/registry/packages/aws/api-docs/rds/subnetgroup/
                // See https://github.com/pulumi/pulumi-aws/issues/390
                // dbSubnetGroupName: vpc.id,
                // vpcSecurityGroupIds: [ sg.id ]
              }, {
                  // TODO Do we want/need this here?
                  provider: cluster.provider,

                  dependsOn: dependsOn
              });
        }

}
