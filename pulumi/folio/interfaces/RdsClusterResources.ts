import * as aws from "@pulumi/aws";

export interface RdsClusterResources {
    cluster: aws.rds.Cluster;
    instances: aws.rds.ClusterInstance[];
}
