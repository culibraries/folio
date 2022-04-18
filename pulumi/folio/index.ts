import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";

import * as vpc from "./vpc"
import * as iam from "./iam";
import * as cluster from "./cluster";
import * as kafka from "./kafka";
import * as postgresql from "./postgresql";
import * as observability from "./observability";
import * as folio from "./folio";
import * as util from "./util";

import { FolioModule } from "./classes/FolioModule";
import { FolioDeployment } from "./classes/FolioDeployment";
import { RdsClusterResources } from "./classes/RdsClusterResources";
import { Resource } from "@pulumi/pulumi";

// import * as pulumiPostgres from "@pulumi/postgresql";

// Set some default tags which we will add to when defining resources.
const tags = {
    "Owner": "CTA",
    "Environment": pulumi.getStack(),
    "Product": "FOLIO",
    "Accounting": "cubl-folio",
    "DataClassificationCompliance": "standard"
};

// Create the CIDR block for the VPC. This is the default, but there
// are some items in our security group that should have this range rather
// than being completely open.
// For more information see: https://www.pulumi.com/docs/guides/crosswalk/aws/vpc/#configuring-cidr-blocks-for-a-vpc
const clusterCidrBlock = "10.0.0.0/16";

// Create our VPC and security group.
const folioVpc = vpc.deploy.awsVpc("folio-vpc", tags, 3, 1, clusterCidrBlock);
export const folioVpcId = folioVpc.id;

const folioSecurityGroup = vpc.deploy.awsSecurityGroup("folio-security-group",
    tags, folioVpc.id, clusterCidrBlock);

// Export a few resulting fields from the VPC and security group to make them
// easier to use and reference.
export const vpcId = folioVpc.id;
export const folioSecurityGroupId = folioSecurityGroup.id;
export const vpcPrivateSubnetIds = folioVpc.privateSubnetIds;
export const vpcPublicSubnetIds = folioVpc.publicSubnetIds;

// Create the database resources that are needed in our VPC. At minimum we need a
// database subnet group, and a cluster reference.
const config = new pulumi.Config();
export const folioDbPort = 5432;
export const dbSubnetGroupName = "folio-db-subnet";
const dbSubnetGroup = new aws.rds.SubnetGroup(dbSubnetGroupName, {
    tags: { "Name": dbSubnetGroupName, ...tags },
    subnetIds: vpcPrivateSubnetIds
});

/**
 * The pulumi configuration key which points to the database cluster this
 * stack should use. When the stack has this key it means that a decision has been made
 * to not use the db cluster that the stack created when it was stood up
 * initially. Two conditions are possible:
 * 1) The key exists in configuration indicating that an external cluster should be used.
 * 2) The key does not exist, indicating that this stack has and should create and manage
 * its own db cluster.
 */
const dbClusterConfigKey = "db-cluster-identifier";

/**
 * Checks our pulumi stack configuration to determine whether the current state of the
 * stack indicates that a new cluster should be created.
 * @returns True if a new database cluster should be created.
 */
function shouldCreateOwnDbCluster(): boolean {
    return config.get(dbClusterConfigKey) == undefined;
}

const dbAdminUser = config.requireSecret("db-admin-user");
const dbAdminPassword = config.requireSecret("db-admin-password");
const dbUserName = config.requireSecret("db-user-name");
const dbUserPassword = config.requireSecret("db-user-password");

// Create the RDS resources, if they are needed. Note that on the first run a stack
// always needs a RDS cluster to be deployed, otherwise subsequent steps won't work.
// But once a full stack is deployed, the RDS cluster can be swapped out by adding
// a special key in the configuration which will perform the swap on subsequent updates.
let rdsClusterResources = {} as RdsClusterResources;
if (shouldCreateOwnDbCluster()) {
    const clusterName = pulumi.getStack() === "scratch" ? "folio-pg-scratch" : "folio-pg";
    const pgFinalSnapshotId = `${clusterName}-cluster-final-snapshot-0`;
    const pgClusterId = `${clusterName}-cluster`;
    rdsClusterResources = postgresql.deploy.newRdsCluster(clusterName,
        tags,
        pgClusterId,
        dbSubnetGroup,
        [
            "us-west-2a",
            "us-west-2b",
            "us-west-2c"
        ],
        folioDbPort,
        pulumi.interpolate`${dbAdminUser}`,
        pulumi.interpolate`${dbAdminPassword}`,
        30,
        "07:00-09:00",
        "12.7",
        folioSecurityGroupId,
        pgFinalSnapshotId,
        true,
        "db.r6g.large",
        [folioVpc, dbSubnetGroup]);
}

// Bind whichever cluster we have to the cluster endpoint that this stack owns.
// The cluster endpoint is persistent, but the underlying database cluster can be
// swapped out anytime via setting the special configuration key.
let dbClusterIdentifier: pulumi.Output<string>;
let dbResourceDependencies = new Array<Resource>();
if (shouldCreateOwnDbCluster()) {
    dbClusterIdentifier = rdsClusterResources.cluster.id;
    dbResourceDependencies.concat([rdsClusterResources.cluster, ...rdsClusterResources.instances]);
} else {
    // The interpolate call is needed to convert the literal to the Output type.
    dbClusterIdentifier = pulumi.interpolate`${config.require(dbClusterConfigKey)}`;
    dbResourceDependencies.concat([folioVpc, dbSubnetGroup]);
}
export const customEndpointName = pulumi.getStack();
const clusterEndpoint = new aws.rds.ClusterEndpoint(customEndpointName, {
    clusterIdentifier: dbClusterIdentifier,
    clusterEndpointIdentifier: customEndpointName,
    customEndpointType: "ANY",
    tags: {"Name": customEndpointName, ...tags },
}, {
    // This doesn't mean that the dns entry will change. If fact, the dns remains
    // the same after a new instance is created.
    deleteBeforeReplace: true,
    dependsOn: dbResourceDependencies
});

// Export the custom cluster endpoint to be the db host which is used by the app.
export const folioDbHost = clusterEndpoint.endpoint;

// Create our own IAM role and profile which we can bind into the EKS cluster's
// NodeGroup when we create it next. Cluster will also create a default for us, but
// we show here how to create and bind our own.
const workerRoleManagedPolicyArns: string[] = [
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
];
// TODO The CloudWatchAgentServerPolicy isn't being added through code. You can see this in
// the IAM console. It's not there. The other ones are though.
// TODO Should we attach this too? arn:aws:iam::aws:policy/CloudWatchLogsFullAccess

const folioWorkerRoleName = "folio-worker-role";
const folioWorkerRole:aws.iam.Role = iam.deploy.awsRoleWithManagedPolicyAttachments
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

export const eksClusterName = folioCluster.eksCluster.name;

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

// Export the cluster's kubeconfig.
export const kubeconfig = folioCluster.kubeconfig;

// Create a k8s namespace.
// You must define the provider that you want to use for creating the namespace.
export const folioNamespace = new k8s.core.v1.Namespace("folio", {}, { provider: folioCluster.provider });

// Export the namespace for us in other functions.
export const folioNamespaceName = folioNamespace.metadata.name;

// Create an object to represent the FOLIO deployment.
const releaseFilePath = "./deployments/R2-2021.yaml";
const tenant = "cubl";
const okapiUrl = "http://okapi:9130";
const containerRepo = "folioorg";
const folioDeployment = new FolioDeployment(tenant,
    releaseFilePath,
    okapiUrl,
    containerRepo);

// Create a configMap for folio for certain non-secret environment variables that will be deployed.
const configMapData = {
    DB_PORT: folioDbPort.toString(),
    DB_DATABASE: "folio",
    DB_QUERYTIMEOUT: "60000",
    DB_CHARSET: "UTF-8",
    DB_MAXPOOLSIZE: "5",
    // TODO Add KAFKA_HOST, KAFKA_PORT
};
const appName = "folio";
const appLabels = { appClass: appName };
const configMap = folio.deploy.configMap("default-config",
    configMapData, appLabels, folioCluster, folioNamespace, [folioNamespace]);

// Create a secret for folio to store our environment variables that k8s will inject into each pod.
// These secrets have been set in the stack using the pulumi command line.
var dbConnectSecretData = {
    DB_HOST: util.base64Encode(folioDbHost),
    DB_USERNAME: util.base64Encode(pulumi.interpolate`${dbUserName}`),
    DB_PASSWORD: util.base64Encode(pulumi.interpolate`${dbUserPassword}`),

    // It would appear that folio-helm wants this in this secret rather than the configMap.
    DB_PORT: Buffer.from(folioDbPort.toString()).toString("base64"),

    PG_ADMIN_USER: util.base64Encode(pulumi.interpolate`${dbAdminUser}`),
    PG_ADMIN_USER_PASSWORD: util.base64Encode(pulumi.interpolate`${dbAdminPassword}`),
    DB_DATABASE: Buffer.from("postgres").toString("base64"),
    KAFKA_HOST: Buffer.from("kafka").toString("base64"),
    KAFKA_PORT: Buffer.from("9092").toString("base64"),
    OKAPI_URL: Buffer.from(folioDeployment.okapiUrl).toString("base64"),

    // These two vars are required for for mod-agreements and mod-licenses.
    // For background see https://github.com/culibraries/folio-ansible/issues/22
    OKAPI_SERVICE_PORT: Buffer.from("9130").toString("base64"),
    OKAPI_SERVICE_HOST: Buffer.from("okapi").toString("base64"),

    // This is unique to folio-helm. It is required for many of the charts to run
    // (mod-inventory-storage) for example. The background is that it is used to distinguish
    // between the various development teams' k8s (rancher) deployments. In our case that
    // isn't relevant so we just set it to "cu".
    ENV: Buffer.from("cu").toString("base64"),

    // Not entirely sure if this makes mod-licenses and mod-agreements behave
    // but they are behaving and don't think there's a harm in leaving it in.
    GRAILS_SERVER_PORT: Buffer.from("8080").toString("base64"),

    // These two are required by mod-service-interaction.
    OKAPI_PORT: Buffer.from("9130").toString("base64"),
    OKAPI_HOST: Buffer.from("okapi").toString("base64")
};
// Deploy the main secret which is used by modules to connect to the db. This
// secret name is used extensively in folio-helm.
const dbConnectSecret = folio.deploy.secret("db-connect-modules", dbConnectSecretData,
    appLabels, folioCluster, folioNamespace, [folioNamespace]);

// Bucket required by mod-data-export, which is required by mod-inventory.
// TODO Create this bucket in pulumi.
const dataExportBucket = `folio-data-export-${pulumi.getStack()}`;
var s3CredentialsDataExportSecretData = {
    AWS_ACCESS_KEY_ID: Buffer.from("TODO").toString("base64"),
    AWS_BUCKET: Buffer.from(dataExportBucket).toString("base64"),
    AWS_REGION: Buffer.from("TODO").toString("base64"),
    AWS_SECRET_ACCESS_KEY: Buffer.from("TODO").toString("base64"),
    AWS_URL: Buffer.from("https://s3.amazonaws.com").toString("base64")
};
const s3CredentialsDataExportSecret = folio.deploy.secret("s3-credentials-data-export",
    s3CredentialsDataExportSecretData, appLabels, folioCluster,
    folioNamespace, [folioNamespace]);
// Note for some reason the folio-helm chart for mod-data-export-worker requires the same items
// but with a different name.
const s3CredentialsSecret = folio.deploy.secret("s3-credentials",
    s3CredentialsDataExportSecretData, appLabels, folioCluster,
    folioNamespace, [folioNamespace]);

// Deploy Kafka via a Helm Chart into the FOLIO namespace.
export const kafkaInstance = kafka.deploy.helm("kafka", folioCluster, folioNamespace,
    [folioNamespace]);

// Create the database itself if a new db cluster is being stood up.
// This can run multiple times without causing trouble.
var dbCreateJob = {} as k8s.batch.v1.Job;
// Run a k8s job to create the FOLIO database if we're creating a new cluster from scratch.
 if (shouldCreateOwnDbCluster()) {
    dbCreateJob = postgresql.deploy.databaseCreation("create-database",
        folioNamespace,
        folioCluster,
        pulumi.interpolate`${dbAdminUser}`,
        pulumi.interpolate`${dbAdminPassword}`,
        pulumi.interpolate`${dbUserName}`,
        pulumi.interpolate`${dbUserPassword}`,
        folioDbHost,
        "postgres",
        [folioNamespace, rdsClusterResources.cluster, ...rdsClusterResources.instances]);
}
// Prepare the list of modules to deploy.
const modules: FolioModule[] = folio.prepare.moduleList(folioDeployment);

// Get a reference to the okapi module.
const okapiModule: FolioModule = util.getModuleByName("okapi", modules);

// The cublctaCertArn is a wildcard certificate so there's only one ARN. This is *.cublcta.com.
const cublCtaCertArn: string =
    "arn:aws:acm:us-west-2:735677975035:certificate/5b3fc124-0b6e-4698-9c31-504c84a979ba";
// folio.colorado.edu
const stripesProdCertArn: string =
    "arn:aws:acm:us-west-2:735677975035:certificate/0e57ac8a-4fd5-4dbe-b8ac-d8f486798293";
// folio.colorado.edu
const okapiProdCertArn: string = "arn:aws:acm:us-west-2:735677975035:certificate/693d17a8-72b3-46b7-84f5-defe467d0896";

// Until we have a better way to cut over between environments, we need to let the stack
// control which which cert gets bound to the okapi service.
const okapiCertArn: string = pulumi.getStack() === "scratch" ? cublCtaCertArn : okapiProdCertArn;

// Deploy okapi first, being sure that other dependencies have deployed first.
var okapiDependencies: pulumi.Resource[] = [dbConnectSecret, s3CredentialsDataExportSecret,
    s3CredentialsSecret, configMap, kafkaInstance];
// Check to see if we're creating a new db cluster. If we are, then add the job
// to create the database to the okapi dependencies.
if (shouldCreateOwnDbCluster()) {
    okapiDependencies.push(dbCreateJob);
}
const productionOkapiRelease: k8s.helm.v3.Release = folio.deploy.okapi(okapiModule,
    okapiCertArn, folioCluster, folioNamespace, okapiDependencies);

// Deploy the rest of the modules that we want. This excludes okapi.
const moduleReleases = folio.deploy.modules(modules, folioCluster, folioNamespace,
    [productionOkapiRelease]);

// These deploy with the name "platform-complete-dev or platform-complete for prod".
// These tags and containers are the result of a manual build process. See the readme in the
// containers/folio/stripes directory for how to do that.
folio.deploy.stripes(false, "ghcr.io/culibraries/folio_stripes", "2021.r2.6", stripesProdCertArn,
    folioCluster, folioNamespace, [...moduleReleases]);
folio.deploy.stripes(true, "ghcr.io/culibraries/folio_stripes", "dev.2021.r2.6", cublCtaCertArn,
    folioCluster, folioNamespace, [...moduleReleases]);

// TODO should we be pushing the deployment descriptors for front end modules at all?
// NOTE folio-helm does, whereas TAMU does not.
// Should we run these as separate jobs? Because right now if I add another module
// I have to delete and recreate the job whereas which then re-registers every module
// taking quite a while. This might work better if there was 1 pod per job so each
// per job. Alternatively we just move this out of pulumi completely.
const modDescriptorJob = folio.deploy.deployModuleDescriptors("deploy-mod-descriptors",
    folioNamespace, folioCluster, modules, [...moduleReleases]);

// TODO Determine if the Helm chart takes care of the following:
// Create hazelcast service account
// Create hazelcast configmap

// const superUserName = config.requireSecret("superuser-name");
// const superUserPassword = config.requireSecret("superuser-password");
// TODO We need a job to register the modules. We have a script for it, but not
// yet a job. This can't be run until that has taken place so commenting out for
// now.
// const modRegistrationJob = folio.deploy.bootstrapSuperuser
//     ("mod-reg-and-bootstrap-superuser",
//     pulumi.interpolate`${superUserName}`,
//     pulumi.interpolate`${superUserPassword}`,
//     folioDeployment,
//     folioNamespace,
//     folioCluster,
//     [modDescriptorJob]);

//observability.deploy.helm("observability", folioCluster, "us-west-2", [ folioCluster ]);
