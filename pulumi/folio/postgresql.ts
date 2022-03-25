import { RdsClusterResources } from "./classes/RdsClusterResources";

import * as pulumi from "@pulumi/pulumi";
import { Output, Resource } from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as eks from "@pulumi/eks";
import * as aws from "@pulumi/aws";

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

    export function newRdsCluster(
        name: string,
        tags: object,
        clusterIdentifier: string,
        dbSubnetGroup: aws.rds.SubnetGroup,
        availabilityZones: string[],
        port: number,
        pgAdminUser: Output<string>,
        pgAdminPassword: Output<string>,
        backupRetentionPeriod: number,
        preferredBackupWindow: string,
        engineVersion: string,
        vpcSecurityGroupIds: Output<string>,
        finalSnapshotIdentifier: string,
        skipFinalSnapshot: boolean,

        instanceClass: string,
        clusterInstanceCount: number,
        dependsOn?: Resource[]): RdsClusterResources {

        const cluster = new aws.rds.Cluster(name, {
            tags: { "Name": name, ...tags },
            availabilityZones: availabilityZones,
            backupRetentionPeriod: backupRetentionPeriod,
            clusterIdentifier: clusterIdentifier,
            databaseName: "postgres",
            engine: "aurora-postgresql",
            engineVersion: engineVersion,
            masterUsername: pgAdminUser,
            masterPassword: pgAdminPassword,
            preferredBackupWindow: preferredBackupWindow,
            dbSubnetGroupName: dbSubnetGroup.name,
            port: port,

            // If this is false then there needs to be a final snapshot identifier and a final
            // snapshot will be made before it is deleted.
            skipFinalSnapshot: skipFinalSnapshot,
            finalSnapshotIdentifier: finalSnapshotIdentifier,

            // This is necessary, otherwise it will bind the rds cluster to the default security
            // group.
            vpcSecurityGroupIds:[ vpcSecurityGroupIds ],
        }, {
            dependsOn: dependsOn
        });

        const clusterInstances: aws.rds.ClusterInstance[] = [];
        for (const range = { value: 0 }; range.value < clusterInstanceCount; range.value++) {
            clusterInstances.push(new aws.rds.ClusterInstance(`${name}-cluster-instance-${range.value}`, {
                tags: { "Name": name, ...tags },
                identifier: `${name}-cluster-instance-${range.value}`,
                clusterIdentifier: clusterIdentifier,
                instanceClass: instanceClass,
                engine: "aurora-postgresql",
                engineVersion: engineVersion,
                dbSubnetGroupName: dbSubnetGroup.name
            }, {
                dependsOn: cluster
            }));
        }

        return new RdsClusterResources(cluster, clusterInstances);
    }

    export function databaseCreation(
        name: string,
        namespace: k8s.core.v1.Namespace,
        cluster: eks.Cluster,
        pgAdminUser: Output<string>,
        pgAdminPassword: Output<string>,
        dbUsername: Output<string>,
        dbPassword: Output<string>,
        dbHost: Output<string>,
        dbDatabase: string,
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
                                { name: "PG_ADMIN_USER", value: pgAdminUser },
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
                backoffLimit: 1,
            },
        }, {
            provider: cluster.provider,

            dependsOn: dependsOn,

            deleteBeforeReplace: true,
        });
    }

}
