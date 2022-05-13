import * as aws from "@pulumi/aws";
import { Output, Resource } from "@pulumi/pulumi";

export interface RdsArgs {
    clusterName: string,
    clusterId: string,
    dbSubnetGroup: aws.rds.SubnetGroup,
    availabilityZones: string[],
    dbPort: number,
    adminUser: Output<string>,
    adminPassword: Output<string>,
    backupRetentionPeriod: number,
    backupWindow: string,
    dbVersion: string,
    vpcSecurityGroupId: Output<string>,
    finalSnapshotId: string,
    skipFinalSnapshot: boolean,
    instanceClass: string,
    tags: any,
    dependsOn?: Resource[]
}
