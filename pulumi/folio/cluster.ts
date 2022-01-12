import * as eks from "@pulumi/eks";
import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";

export module deploy {
    export function awsEksCluster(
        name: string,
        tags: object,
        vpc: awsx.ec2.Vpc,
        sg: aws.ec2.SecurityGroup,
        workerRole: aws.iam.Role,
        adminRole: aws.iam.Role): eks.Cluster {
        const cluster = new eks.Cluster(name, {
            // Applies tags to all resources under management of the cluster.
            tags: { "Name": name, ...tags },

            // Apply tags to this cluster.
            clusterTags: { "Name": name, ...tags },

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
            instanceRoles: [workerRole],

            // Enable control plane logging. This sends logs to CloudWatch.
            enabledClusterLogTypes: [
                "api",
                "audit",
                "authenticator"
            ],

            // Set the desired kubernetes version.
            version: "1.21",

            roleMappings: [
                // Provides full administrator cluster access to the k8s cluster.
                {
                    groups: ["system:masters"],
                    roleArn: adminRole.arn,
                    username: "pulumi:admin-usr",
                }
            ],
        });

        return cluster;
    }

    export function awsCreateEksNodeGroup(nodeGroupArgs: any, cluster: eks.Cluster, ip: aws.iam.InstanceProfile) {
        cluster.createNodeGroup(nodeGroupArgs.name, {
            instanceType: aws.ec2.InstanceType.T3_XLarge,
            desiredCapacity: nodeGroupArgs.desiredCapacity,
            minSize: nodeGroupArgs.minSize,
            maxSize: nodeGroupArgs.maxSize,

            // On-demand are the more expensive, non-spot instances.
            labels: nodeGroupArgs.labels,

            // Bind the instance profile to the NodeGroup.
            instanceProfile: ip
        });
    }

    export function awsApplyClusterAdminRoleToCluster(adminRoleName: string, cluster: eks.Cluster) {
        new k8s.rbac.v1.ClusterRole(adminRoleName, {
            metadata: {
                name: adminRoleName
            },
            rules: [{
                apiGroups: ["*"],
                resources: ["*"],
                verbs: ["*"],
            }]
        }, { provider: cluster.provider });
    }

    export function awsAddOn(name: string, addOnName:string, tags: object, cluster: eks.Cluster) {
        new aws.eks.Addon(name, {
            tags: { "Name": name, ...tags },
            clusterName: cluster.eksCluster.name,
            addonName: addOnName,
        });
    }
}
