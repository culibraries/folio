import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";

import * as vpc from "./vpc"
import * as iam from "./iam";
import * as cluster from "./cluster";
import * as kafka from "./kafka";
import * as postgresql from "./postgresql";
import * as folio from "./folio";
import * as util from "./util";

import { FolioModule } from "./classes/FolioModule";
import { FolioDeployment } from "./classes/FolioDeployment";

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

// Create an object to represent the FOLIO deployment.
const release = "./releases/R2-2021.json";
const tenant = "cubl";
const okapiUrl = "http://okapi:9130";
const loadRefData = false;
const loadSampleData = false;
const containerRepo = "folioorg";
const folioDeployment = new FolioDeployment(tenant,
    release,
    loadRefData,
    loadSampleData,
    folioCluster,
    folioNamespace,
    okapiUrl,
    containerRepo);

// Deploy Kafka via a Helm Chart into the FOLIO namespace
export const kafkaInstance = kafka.deploy.helm(folioDeployment);

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
folio.deploy.configMap("default-config", configMapData, appLabels, folioDeployment);

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
    // TODO It would appear that folio-helm wants this in this secret rather than the configMap.
    DB_PORT: Buffer.from("5432").toString("base64"),
    PG_ADMIN_USER: util.base64Encode(pulumi.interpolate`${dbAdminUser}`),
    PG_ADMIN_USER_PASSWORD: util.base64Encode(pulumi.interpolate`${dbAdminPassword}`),
    DB_DATABASE: Buffer.from("postgres").toString("base64"),
    KAFKA_HOST: Buffer.from("kafka").toString("base64"),
    KAFKA_PORT: Buffer.from("9092").toString("base64")
};

// TODO Add a conditional for this, it should not run every time.
// Alternatively, update the script to handle a case where the DB and user already exist.
export const postgresqlInstance = postgresql.deploy.helm(folioDeployment, dbAdminPassword);

// Deploy the main secret which is used by modules to connect to the db. This
// secret name is used extensively in folio-helm.
folio.deploy.secret("db-connect-modules", secretData, appLabels, folioDeployment);

// Prepare the list of modules to deploy.
const modules = folio.prepare.moduleList(folioDeployment);

// Get a reference to the okapi module.
const okapi: FolioModule = util.getModuleByName("okapi", modules);

// Deploy okapi first.
const okapiRelease: k8s.helm.v3.Release = folio.deploy.okapi(okapi, folioDeployment);

// Deploy the rest of the modules that we want. This excludes okapi.
folio.deploy.modules(modules, folioDeployment, okapiRelease);

// TODO Determine if the Helm chart takes care of the following:
// Create hazelcast service account
// Create okapi pod service account
// Create okapi service
// Create hazelcast configmap
// Create okapi deployment
// Create okapi ingress
