import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export interface NodeGroupArgs {
    name: "folio-node-group",
    instanceType: aws.ec2.InstanceType,
    desiredCapacity: number,
    minSize: number,
    maxSize: number,
    // On-demand are the more expensive, non-spot instances.
    labels: any
}
