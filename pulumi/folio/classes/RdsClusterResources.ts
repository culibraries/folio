import * as aws from "@pulumi/aws";

export class RdsClusterResources {
    cluster: aws.rds.Cluster;

    instances: aws.rds.ClusterInstance[];

    constructor(cluster: aws.rds.Cluster,
        instances: aws.rds.ClusterInstance[]) {
        this.cluster = cluster;
        this.instances = instances;
    }
}
