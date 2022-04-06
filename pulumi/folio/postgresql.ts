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

        // NOTE: Very important! Currently (Iris) FOLIO is known to behave properly only when there is one
        // RDS instance that does both reading and writing. If you have more than one instance, RDS
        // will make the first instance a read-only instance. The second instance will be both a reader
        // and a writer (appearing as a "Writer") in the AWS RDS console. When there is both a reader
        // and a writer, either FOLIO or RDS (it is currently unknown -- see issue #230 for background)
        // doesn't know which endpoint to call depending on the type of operation. So what will happen
        // is a write will hit the reader and cause an error, not allowing the write to succeed since
        // it is read only.
        const clusterInstances: aws.rds.ClusterInstance[] = [];
        clusterInstances.push(new aws.rds.ClusterInstance(`${name}-cluster-instance-1`, {
            tags: { "Name": name, ...tags },
            identifier: `${name}-cluster-instance-1`,
            clusterIdentifier: clusterIdentifier,
            instanceClass: instanceClass,
            engine: "aurora-postgresql",
            engineVersion: engineVersion,
            dbSubnetGroupName: dbSubnetGroup.name
        }, {
            dependsOn: cluster
        }));

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
