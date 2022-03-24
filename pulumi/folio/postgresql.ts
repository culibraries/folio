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

        instanceClass: string,
        clusterInstanceCount: number): RdsClusterResources {

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

            // TODO Determine what to do with this. Seems like we should be snapshotting before
            // deletion and deletion can easily occur if the cluster is removed from the stack.
            // Setting this property doesn't help.
            // But will setting it on create help next time we want to do pulumi destroy
            // and actually destroy the db when destroying?
            // See https://stackoverflow.com/questions/50930470/terraform-error-rds-cluster-finalsnapshotidentifier-is-required-when-a-final-s
            // Manually changing the skipFinalSnapshot values in an exported stack.json does
            // work however.
            skipFinalSnapshot: true,
            finalSnapshotIdentifier: finalSnapshotIdentifier,

            // This is necessary, otherwise it will bind the rds cluster to the default security
            // group.
            vpcSecurityGroupIds:[ vpcSecurityGroupIds ],
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
