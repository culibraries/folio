import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

import * as vpc from "./vpc"
import * as iam from "./iam";
import * as cluster from "./cluster";
import * as kafka from "./kafka";
import * as postgresql from "./postgresql";
import * as folio from "./folio";
import * as util from "./util";

import * as k8s from "@pulumi/kubernetes";
import { FolioModule } from "./classes/FolioModule";

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
// TODO The commented out add ons are not deploying properly here.
//cluster.deploy.awsAddOn("folio-vpc-cni-addon", "vpc-cni", tags, folioCluster);
cluster.deploy.awsAddOn("folio-kube-proxy-addon", "kube-proxy", tags, folioCluster);
//cluster.deploy.awsAddOn("folio-coredns-addon", "coredns", tags, folioCluster);

// Export a few resulting fields to make them easy to use.
export const vpcId = folioVpc.id;
export const vpcPrivateSubnetIds = folioVpc.privateSubnetIds;
export const vpcPublicSubnetIds = folioVpc.publicSubnetIds;

// Export the cluster's kubeconfig.
export const kubeconfig = folioCluster.kubeconfig;

// Create a namespace.
// You must define the provider that you want to use for creating the namespace. 
const folioNamespace = new k8s.core.v1.Namespace("folio", {}, { provider: folioCluster.provider });

// Export the namespace for us in other functions.
export const folioNamespaceName = folioNamespace.metadata.name;

// Deploy Kafka via a Helm Chart into the FOLIO namespace
export const kafkaInstance = kafka.deploy.helm(folioCluster, folioNamespaceName);

// Deploy PostgreSQL via a Helm Chart into the FOLIO namespace
export const postgresqlInstance = postgresql.deploy.helm(folioCluster, folioNamespaceName);

// Create a configMap for folio for certain non-secret environment variables that will be deployed.
const appName = "folio";
const appLabels = { appClass: appName };

const configMapData = {
    DB_PORT: "5432",
    DB_DATABASE: "folio",
    DB_QUERYTIMEOUT: "60000",
    DB_CHARSET: "UTF-8",
    DB_MAXPOOLSIZE: "5",
    // TODO Add KAFKA_HOST, KAFKA_PORT
};
const configMap = folio.deploy.configMap("default-config", configMapData, appLabels, folioCluster, folioNamespace);

// Create a secret for folio to store our environment variables that k8s will inject into each pod.
// These secrets have been set in the stack using the pulumi command line.
const config = new pulumi.Config();
const dbHost = config.requireSecret("db-host");
const dbAdminUser = config.requireSecret("db-admin-user");
const dbAdminPassword = config.requireSecret("db-admin-password");
const dbUserName = config.requireSecret("db-user-name");
const dbUserPassword = config.requireSecret("db-user-password");
var secretData = {
    DB_HOST: util.base64Encode(pulumi.interpolate`${dbHost}`),
    DB_USERNAME: util.base64Encode(pulumi.interpolate`${dbUserName}`),
    DB_PASSWORD: util.base64Encode(pulumi.interpolate`${dbUserPassword}`),
    PG_ADMIN_USER: util.base64Encode(pulumi.interpolate`${dbAdminUser}`),
    PG_ADMIN_USER_PASSWORD: util.base64Encode(pulumi.interpolate`${dbAdminPassword}`),
    DB_DATABASE: Buffer.from("postgres").toString("base64"),
    KAFKA_HOST: Buffer.from("kafka").toString("base64"),
    KAFKA_PORT: Buffer.from("9092").toString("base64")
};
const secret = folio.deploy.secret("db-connect-modules", secretData, appLabels, folioCluster, folioNamespace);

// Create the PostgreSQL database using a container.
// TODO Add a conditional for this, it should not run every time. Alternatively, update the script to handle a case where the DB and user already exist.
const postgresqlDatabase = postgresql.deploy.createDatabase(secret, folioNamespace);


// TODO Determine if the Helm chart takes care of the following:
// Create hazelcast service account
// Create okapi pod service account
// Create okapi service
// Create hazelcast configmap
// Create okapi deployment
// Create okapi ingress


// const modulesToDeploy = [
//     "okapi",
//     // "mod-users",
//     // "mod-login",
//     // "mod-permissions",
//     // "mod-authtoken",
//     // "mod-configuration"
// ];
// const release = "R2-2021";
// const moduleListPromise = folio.prepare.moduleList(modulesToDeploy, release);
// moduleListPromise.then(modules => {
//     // TODO This method of deploying is likely what is causing the pods to become
//     // disconnected from pulumi. It can create, but then has no record of them in
//     // the state. This can be confirmed by testing outside of the promise.
//     folio.deploy.modules(modules, folioCluster, folioNamespace);
// }).catch(err => {
//     console.error(`Unable to create folio module list: ${err}`);
// });

let modules = new Array<FolioModule>();
modules.push(new FolioModule("okapi", "4.9.0"));
folio.deploy.modules(modules, folioCluster, folioNamespace);
