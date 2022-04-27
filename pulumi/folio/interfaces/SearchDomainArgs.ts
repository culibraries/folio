import { Output, Resource } from "@pulumi/pulumi";
import { FolioDeployment } from "../classes/FolioDeployment";

export interface SearchDomainArgs {
    name: string,
    fd: FolioDeployment,
    vpcSecurityGroupId: Output<string>,
    subnetIds: Promise<Output<string>[]>,
    instanceType: string,
    instanceCount: number,
    dedicatedMasterType: string,
    volumeSize: number,
    dependsOn?: Resource[]
}
