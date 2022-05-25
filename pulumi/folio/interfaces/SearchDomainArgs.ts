import { Output, Resource } from "@pulumi/pulumi";
import { FolioDeployment } from "../classes/FolioDeployment";

export interface SearchDomainArgs {
    name: string,
    fd: FolioDeployment,
    vpcSecurityGroupId: Output<string>,
    privateSubnetIds?: Output<string[]>,
    instanceType: string,
    instanceCount: number,
    dedicatedMasterType: string,
    volumeSize: number,
    masterUserUsername: Output<string>,
    masterUserPassword: Output<string>,
    awsAccountId: Output<string>,
    awsRegion: string,
    clusterCidrBlock: string,
    tags: any,
    dependsOn?: Resource[]
}
