import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Define a function for tags.
function tags(name: string): pulumi.Input<aws.Tags> {
    return {
        "Name": name,
        "Owner": "CTA",
        "Environment": pulumi.getStack(),
        "Product": "FOLIO",
        "Accounting": "cubl-folio",
        "DataClassificationCompliance": "standard"
    }
}

// Allocate a new VPC with the default settings:
const vpc = new awsx.ec2.Vpc("folio-vpc", {
    numberOfAvailabilityZones: 2,
    // This is the default behavior but we make it explicit here.
    // The name helps identify the resource.
    subnets: [{ type: "public", tags: tags("folio-public-subnet") },
              { type: "private", tags: tags("folio-private-subnet") }],

    tags: tags("folio-vpc")
});

// Allocate a security group and then a series of rules.
const sg = new awsx.ec2.SecurityGroup("folio-sg", {
    vpc,
    tags: tags("folio-sg")
});

// 1) inbound HTTPS traffic on port 443 from anywhere
sg.createIngressRule("folio-https-access", {
    location: new awsx.ec2.AnyIPv4Location(),
    ports: new awsx.ec2.TcpPorts(443),
    description: "allow HTTPS access from anywhere",
});

// 2) outbound TCP traffic on any port to anywhere
sg.createEgressRule("folio-outbound-access", {
    location: new awsx.ec2.AnyIPv4Location(),
    ports: new awsx.ec2.AllTcpPorts(),
    description: "allow outbound access to anywhere",
});

// Export a few resulting fields to make them easy to use.
export const vpcId = vpc.id;
export const vpcPrivateSubnetIds = vpc.privateSubnetIds;
export const vpcPublicSubnetIds = vpc.publicSubnetIds;