import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";

// Set some default tags which we will add to when defining resources.
const tags = {
    "Owner": "CTA",
    "Environment": pulumi.getStack(),
    "Product": "FOLIO",
    "Accounting": "cubl-folio",
    "DataClassificationCompliance": "standard"
};

// Allocate a new VPC with the default settings using pulumi Crosswalk.
const vpcName = "folio-vpc";
const vpc = new awsx.ec2.Vpc(vpcName, {
    tags: { "Name": vpcName, ...tags },

    // If we have too many AZs and NAT gateways we'll run out of EIPs with our current quota. 
    numberOfAvailabilityZones: 2,

    // We could have these be equal to the number of availability zones for greater
    // fault tollerance. Although the cost will be higher.
    numberOfNatGateways: 1,

    // See https://github.com/pulumi/pulumi-eks/blob/master/examples/subnet-tags/index.ts
    // for what's going on with the tags here.
    subnets: [{
        type: "public", name: "folio-subnet",
        tags: { "kubernetes.io/role/elb": "1", ...tags }
    },
    {
        type: "private", name: "folio-subnet",
        tags: { "kubernetes.io/role/internal-elb": "1", ...tags }
    }]
},
    {
        // Inform pulumi to ignore tag changes to the VPCs or subnets, so that
        // tags auto-added by AWS EKS do not get removed during future
        // refreshes and updates, as they are added outside of pulumi's management
        // and would be removed otherwise.
        // Also see: https://github.com/pulumi/pulumi-eks/blob/master/examples/subnet-tags/index.ts
        // for links to issues with the background on this.
        transformations: [(args: any) => {
            if (args.type === "aws:ec2/vpc:Vpc" || args.type === "aws:ec2/subnet:Subnet") {
                return {
                    props: args.props,
                    opts: pulumi.mergeOptions(args.opts, { ignoreChanges: ["tags"] }),
                };
            }
            return undefined;
        }],
    }
);

// Create the security group. We need a custom security group since we're going
// to expose non-standard ports for things like edge modules. This is using the pulumi
// Classic API. Although Crosswalk (awsx) has its own SecurityGroup type, Cluster
// wants a Classic SecurityGroup type. See Cluster.clusterSecurityGroup below
// where we pass this into the cluster.
const sgName = "folio-sg";
const sg = new aws.ec2.SecurityGroup(sgName, {
    tags: { "Name": sgName, ...tags },
    description: "Security group for FOLIO EKS cluster.",
    vpcId: vpc.id,
    ingress: [{
        description: "Allow inbound traffic on 443",
        fromPort: 443,
        toPort: 443,
        protocol: "tcp",
        cidrBlocks: ["0.0.0.0/0"]
    }, {
        description: "Allow inbound traffic on 9000 for edgeconexion",
        fromPort: 9000,
        toPort: 9000,
        protocol: "tcp",
        cidrBlocks: ["0.0.0.0/0"]
    }],
    egress: [{
        description: "Allow outbound traffic",
        fromPort: 0,
        toPort: 0,
        protocol: "-1",
        cidrBlocks: ["0.0.0.0/0"]
    }]
});

// Create our own IAM role and profile which we can bind nto the cluster's
// NodeGroup. Cluster will also create a default for us, but we show here how
// to create and bind our own.
const managedPolicyArns: string[] = [
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
];

// Creates a role and attaches the EKS worker node IAM managed policies.
export function createRole(name: string): aws.iam.Role {
    const role = new aws.iam.Role(name, {
        tags: { "Name": name, ...tags },

        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
            Service: "ec2.amazonaws.com",
        }),
    });

    let counter = 0;
    for (const policy of managedPolicyArns) {
        // Create RolePolicyAttachment without returning it.
        const rpa = new aws.iam.RolePolicyAttachment(`${name}-policy-${counter++}`,
            { policyArn: policy, role: role },
        );
    }

    return role;
}

// We could create multiple roles and instance profiles here if we wanted to
// perhaps to apply different profiles to different node groups.
const role = createRole("folio-worker-role");
const instanceProfile = new aws.iam.InstanceProfile("folio-instance-profile", { role: role });

// Create an EKS cluster.
const clusterName = "folio-cluster";
const cluster = new eks.Cluster(clusterName, {
    // Applies tags to all resources under management of the cluster.
    tags: { "Name": clusterName, ...tags },

    // Apply tags to this cluster.
    clusterTags: { "Name": clusterName, ...tags },

    // Tell the cluster about its VPC.
    vpcId: vpc.id,
    publicSubnetIds: vpc.publicSubnetIds,
    privateSubnetIds: vpc.privateSubnetIds,
    nodeAssociatePublicIpAddress: false,

    // Need this because we're going to create our own NodeGroup below.
    skipDefaultNodeGroup: true,

    // Bind the SecurityGroup to the cluster. If we don't do this it will create
    // its own default one.
    clusterSecurityGroup: sg,

    // Bind any roles we have created to the cluster.
    instanceRoles: [role],

    // Enable control plane logging. This sends logs to CloudWatch.
    enabledClusterLogTypes: [
        "api",
        "audit",
        "authenticator",
    ],
});

// Create the node group with a bit more control than we would be given with the
// defaults. Using this approach we could create multiple node groups if we wanted to
// each with its own properties and InstanceProfile.
const nodeGroupName = "folio-node-group";
cluster.createNodeGroup(nodeGroupName, {
    instanceType: aws.ec2.InstanceType.T3_XLarge,
    desiredCapacity: 4,
    minSize: 3,
    maxSize: 5,

    // TODO What is this doing?
    labels: { "ondemand": "true" },

    // Bind the instance profile to the NodeGroup.
    instanceProfile: instanceProfile,
});

// Configure the networking addons that we want.
// See https://www.pulumi.com/registry/packages/aws/api-docs/eks/addon/
const vpcCniName = "folio-vpc-cni-addon"
new aws.eks.Addon(vpcCniName, {
    tags: { "Name": vpcCniName, ...tags },
    clusterName: cluster.eksCluster.name,
    addonName: "vpc-cni",
});

const kubeProxyName = "folio-kube-proxy-addon"
new aws.eks.Addon(kubeProxyName, {
    tags: {"Name": kubeProxyName, ...tags},
    clusterName: cluster.eksCluster.name,
    addonName: "kube-proxy",
});

const corednsName = "folio-coredns-addon"
new aws.eks.Addon(corednsName, {
    tags: { "Name": corednsName, ...tags},
    clusterName: cluster.eksCluster.name,
    addonName: "coredns",
});

// Export a few resulting fields to make them easy to use.
export const vpcId = vpc.id;
export const vpcPrivateSubnetIds = vpc.privateSubnetIds;
export const vpcPublicSubnetIds = vpc.publicSubnetIds;

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
