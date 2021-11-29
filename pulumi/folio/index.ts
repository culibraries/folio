import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

import * as vpc from "./vpc"
import * as iam from "./iam";
import * as cluster from "./cluster";
import * as kafka from "./kafka";

import * as k8s from "@pulumi/kubernetes";

// Set some default tags which we will add to when defining resources.
const tags = {
    "Owner": "CTA",
    "Environment": pulumi.getStack(),
    "Product": "FOLIO",
    "Accounting": "cubl-folio",
    "DataClassificationCompliance": "standard"
};

// Create our VPC and security group.
const folioVpc = vpc.deploy.awsVpc("folio-vpc", tags, 2, 1);
const folioSecurityGroup = vpc.deploy.awsSecurityGroup("folio-security-group", tags, folioVpc.id);

// Create our own IAM role and profile which we can bind into the cluster's
// NodeGroup. Cluster will also create a default for us, but we show here how
// to create and bind our own.
const workerRoleManagedPolicyArns: string[] = [
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
];
const folioWorkerRoleName = "folio-worker-role";
const folioWorkerRole = iam.deploy.awsRoleWithManagedPolicyAttachments
    (folioWorkerRoleName, tags, workerRoleManagedPolicyArns, "ec2.amazonaws.com");
const folioInstanceProfile =
    iam.deploy.awsBindRoleToInstanceProfile("folio-worker-role-instance-profile", folioWorkerRole);

// Create a role that will allow access to the cluster when a user assumes the role.
// See the readme file for how this is done.
const folioClusterAdminRoleName = "folio-cluster-admin-role";
const folioClusterAdminRole = iam.deploy.awsRBACRole(folioClusterAdminRoleName, tags);

// Create an EKS cluster.
const folioClusterName = "folio-cluster";
const folioCluster = cluster.deploy.awsEksCluster
    (folioClusterName, tags, folioVpc, folioSecurityGroup, folioWorkerRole, folioClusterAdminRole);

// Create the node group with a bit more control than we would be given with the
// defaults. Using this approach we could create multiple node groups if we wanted to
// each with its own properties and InstanceProfile.
const folioNodeGroupArgs = {
    name: "folio-node-group",
    instanceType: aws.ec2.InstanceType.T3_XLarge,
    desiredCapacity: 4,
    minSize: 3,
    maxSize: 5,
    // On-demand are the more expensive, non-spot instances.
    labels: { "ondemand": "true" }
};
cluster.deploy.awsCreateEksNodeGroup(folioNodeGroupArgs, folioCluster, folioInstanceProfile);

// Configure the networking addons that we want.
// See https://www.pulumi.com/registry/packages/aws/api-docs/eks/addon/
cluster.deploy.awsAddOn("folio-vpc-cni-addon", "vpc-cni", tags, folioCluster);
cluster.deploy.awsAddOn("folio-kube-proxy-addon", "kube-proxy", tags, folioCluster);
cluster.deploy.awsAddOn("folio-coredns-addon", "coredns", tags, folioCluster);

// This is just an example of a deployment that we can do. As we move forward
// we would have one service and deployment for okapi, one for the stripes container,
// and one for any additional containers that require special ports, like edgeconnexion.
const appName = "test-nginx";
const appLabels = { appClass: appName };
new k8s.apps.v1.Deployment(`${appName}-dep`, {
    metadata: { labels: appLabels },
    spec: {
        replicas: 2,
        selector: { matchLabels: appLabels },
        template: {
            metadata: { labels: appLabels },
            spec: {
                containers: [{
                    name: appName,
                    image: "nginx",
                    ports: [{ name: "http", containerPort: 80 }]
                }],
            }
        }
    },
}, { provider: folioCluster.provider });

// This deploys what is an ELB or "classic" load balancer.
const service = new k8s.core.v1.Service(`${appName}-elb-svc`, {
    metadata: { labels: appLabels },
    spec: {
        // This creates an AWS ELB for us.
        type: "LoadBalancer",
        ports: [{ port: 80, targetPort: "http" }],
        selector: appLabels,
    },
}, { provider: folioCluster.provider });

// Export the URL for the load balanced service.
export const url = service.status.loadBalancer.ingress[0].hostname;

// Export a few resulting fields to make them easy to use.
export const vpcId = folioVpc.id;
export const vpcPrivateSubnetIds = folioVpc.privateSubnetIds;
export const vpcPublicSubnetIds = folioVpc.publicSubnetIds;

// Export the cluster's kubeconfig.
export const kubeconfig = folioCluster.kubeconfig;

// Deploy Kafka via a Helm Chart
const kafkaNamespaceName = "kafka";
export const kafkaInstance = kafka.kafka.Helm(kubeconfig, kafkaNamespaceName);
