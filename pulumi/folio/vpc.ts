import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Output } from "@pulumi/pulumi";

export module deploy {
    export function awsVpc(
        name: string, tags: object, availabilityZones: number, natGateways: number, cidrBlock: string): awsx.ec2.Vpc {
        const vpc = new awsx.ec2.Vpc(name, {

            tags: { "Name": name, ...tags },

            // If we have too many AZs and NAT gateways we'll run out of EIPs with our
            // current quota.
            numberOfAvailabilityZones: availabilityZones,

            // We could have these be equal to the number of availability zones for greater
            // fault tolerance. Although the cost will be higher.
            numberOfNatGateways: natGateways,

            // See https://github.com/pulumi/pulumi-eks/blob/e03751425604b5193c00cd2f8858d9b16f7901f0/examples/subnet-tags/index.ts
            // for what's going on with the tags here.
            subnets: [{
                type: "public", name: "folio-subnet",
                tags: { "kubernetes.io/role/elb": "1", ...tags },
            },
            {
                type: "private", name: "folio-subnet",
                tags: { "kubernetes.io/role/internal-elb": "1", ...tags }
            }],

            cidrBlock: cidrBlock
        },
            {
                // Inform pulumi to ignore tag changes to the VPCs or subnets, so that
                // tags auto-added by AWS EKS do not get removed during future
                // refreshes and updates, as they are added outside of pulumi's management
                // and would be removed otherwise.
                // Also see: https://github.com/pulumi/pulumi-eks/blob/master/examples/subnet-tags/index.ts
                // for links to issues with the background on this.
                transformations: [(args: any) => {
                    if (args.type === "aws:ec2/vpc:Vpc" ||
                        args.type === "aws:ec2/subnet:Subnet") {
                        return {
                            props: args.props,
                            opts: pulumi.mergeOptions(args.opts, { ignoreChanges: ["tags"] }),
                        };
                    }
                    return undefined;
                }],
            }
        );

        return vpc;
    }

    export function awsSecurityGroup
        (name: string,
         tags: object,
         vpcId: Output<string>,
         clusterCidrBlock: string): aws.ec2.SecurityGroup {
        // Create the security group. We need a custom security group since we're
        // going to expose non-standard ports for things like edge modules. This
        // is using the pulumi Classic API. Although Crosswalk (awsx) has its own
        // SecurityGroup type, Cluster wants a Classic SecurityGroup type.
        // This security group, being the security group for the VPC, also controls
        // access to our RDS cluster.
        const sg = new aws.ec2.SecurityGroup(name, {
            tags: { "Name": name, ...tags },
            vpcId: vpcId,
            // TODO I'm not loving this. These should be params I think.
            ingress: [{
                description: "Allow inbound traffic on 443",
                fromPort: 443,
                toPort: 443,
                protocol: "tcp",
                cidrBlocks: ["0.0.0.0/0"]
            }, {
                description: "Allow inbound traffic to okapi",
                fromPort: 9130,
                toPort: 9130,
                protocol: "tcp",
                cidrBlocks: ["0.0.0.0/0"]
            }, {
                description: "Allow inbound traffic on 9000 for edgeconexion",
                fromPort: 9000,
                toPort: 9000,
                protocol: "tcp",
                cidrBlocks: ["0.0.0.0/0"]
            }, {
                description: "Allow inbound traffic on 5432 for postgres",
                fromPort: 5432,
                toPort: 5432,
                protocol: "tcp",
                cidrBlocks: [clusterCidrBlock]
            },
            // TODO These can be removed as they are not in scope since we're deploying os out of vpc.
            {
                description: "Allow inbound traffic on 9200 for opensearch",
                fromPort: 9200,
                toPort: 9200,
                protocol: "tcp",
                cidrBlocks: [clusterCidrBlock]
            }, {
                description: "Allow inbound traffic to opensearch dashboard",
                fromPort: 5601,
                toPort: 5601,
                protocol: "tcp",
                cidrBlocks: [clusterCidrBlock]
            }],
            egress: [{
                description: "Allow outbound traffic",
                fromPort: 0,
                toPort: 0,
                protocol: "-1",
                cidrBlocks: ["0.0.0.0/0"]
            }]
        });

        return sg;
    }
}
