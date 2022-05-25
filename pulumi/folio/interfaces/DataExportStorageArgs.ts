import { Resource, Output } from "@pulumi/pulumi";

export interface DataExportStorageArgs {
    name: string,
    tags: object,
    iamUserId: string,
    awsAccountId: Output<string>,
    dependsOn?: Resource[]
}
