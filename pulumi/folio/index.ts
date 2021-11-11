import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";

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
const vpcName = "folio-vpc";
const vpc = new awsx.ec2.Vpc(vpcName, {
    numberOfAvailabilityZones: 2,
    // This is the default behavior but we make it explicit here.
    // The name helps identify the resource.

    // TODO I don't think this is the right way to add tags to Subnets.
    // See https://github.com/pulumi/pulumi-eks/blob/master/examples/subnet-tags/index.ts
    // subnets: [{ type: "public", tags: tags("folio-public-subnet") },
    //           { type: "private", tags: tags("folio-private-subnet") }],
    subnets: [{ type: "public", name: "folio-subnet" },
              { type: "private", name: "folio-subnet" }],

    tags: tags(vpcName)
});

// NOTE We're going to want to configure our own SG so that we can set up
// special ingresses.
const sgName = "folio-sg";
const sg = new aws.ec2.SecurityGroup(sgName, {
        description: "TODO",
        vpcId: vpc.id,
        // TODO new these instead of inlining for readability.
        ingress: [{
            description: "Custom - allow inbound traffic on 443",
            fromPort: 443,
            toPort: 443,
            protocol: "tcp",
            cidrBlocks: ["0.0.0.0/0"]
        }, {
        description: "Custom - allow inbound traffic on 9000",
        fromPort: 9000,
        toPort: 9000,
        protocol: "tcp",
        cidrBlocks: ["0.0.0.0/0"]
        }],
        egress: [{
            description: "Custom - allow outbound traffic",
            fromPort: 0,
            toPort: 0,
            protocol: "-1",
            cidrBlocks: ["0.0.0.0/0"]
        }],
        tags: tags(sgName),
    });

// Export a few resulting fields to make them easy to use.
export const vpcId = vpc.id;
export const vpcPrivateSubnetIds = vpc.privateSubnetIds;
export const vpcPublicSubnetIds = vpc.publicSubnetIds;

// Create an EKS cluster with the default configuration.
const clusterName = "folio-cluster";
const cluster = new eks.Cluster(clusterName, {
    // Tell the cluster about its VPC.
    vpcId: vpc.id,
    publicSubnetIds: vpc.publicSubnetIds,
    privateSubnetIds: vpc.privateSubnetIds,
    nodeAssociatePublicIpAddress: false,

    // Setup the nodes for the cluster.
    instanceType: aws.ec2.InstanceType.T3_XLarge,
    desiredCapacity: 4,
    minSize: 2,
    maxSize: 5,

    // Set up logging.
    enabledClusterLogTypes: [
        "api",
        "audit",
        "authenticator",
    ],

    // Add some tags.
    tags: tags(clusterName),

    // Bind the SecurityGroup to the cluster.
    clusterSecurityGroup: sg

    // TODO Create an IAM role or do we want to take the defaults?
    // TODO Set the k8s version
    
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
