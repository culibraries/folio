import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";

import * as vpc from "./vpc"
import * as iam from "./iam";
import * as cluster from "./cluster";
import * as kafka from "./kafka";
import * as postgresql from "./postgresql";
import * as search from "./search";
import * as folio from "./folio";
import * as util from "./util";
import * as storage from "./storage";

import { Output, Resource } from "@pulumi/pulumi";
import { FolioDeployment } from "./classes/FolioDeployment";
import { RdsClusterResources } from "./interfaces/RdsClusterResources";
import { DynamicSecret } from "./interfaces/DynamicSecret";
import { SearchDomainArgs } from "./interfaces/SearchDomainArgs";
import { NodeGroupArgs } from "./interfaces/NodeGroupArgs";
import { SecretArgs } from "./interfaces/SecretArgs";
import { RdsArgs } from "./interfaces/RdsArgs";
import { BucketResources } from "./interfaces/S3BucketResources";
import { DataExportStorageArgs } from "./interfaces/DataExportStorageArgs";

// Set some default tags which we will add to when defining resources.
const tags = {
    "Owner": "CTA",
    "Environment": pulumi.getStack(),
    "Product": "FOLIO",
    "Accounting": "cubl-folio",
    "DataClassificationCompliance": "standard"
};

// Create an object to represent the FOLIO deployment.
const config = new pulumi.Config();
const awsConfig = new pulumi.Config("aws");
const awsRegion = awsConfig.require("region");
const releaseFilePath = `./deployments/${config.require("release")}.json`;
const tenant = "cubl";
const okapiUrl = "http://okapi:9130";
const containerRepo = "folioorg";
const folioDeployment = new FolioDeployment(tenant,
    releaseFilePath,
    okapiUrl,
    containerRepo);

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

export const folioDbPort = 5432;

// Create the RDS resources, if they are needed. Note that on the first run a stack
// always needs a RDS cluster to be deployed, otherwise subsequent steps won't work.
// But once a full stack is deployed, the RDS cluster can be swapped out by adding
// a special key in the configuration which will perform the swap on subsequent updates.
let rdsClusterResources = {} as RdsClusterResources;
if (shouldCreateOwnDbCluster()) {
    // Create the database resources that are needed in our VPC. At minimum we need a
    // database subnet group, and a cluster reference.
    const dbSubnetGroupName = "folio-db-subnet";
    const dbSubnetGroup = new aws.rds.SubnetGroup(dbSubnetGroupName, {
        tags: { "Name": dbSubnetGroupName, ...tags },
        subnetIds: vpcPrivateSubnetIds
    });

    const clusterName = util.getStackDbIdentifier();
    const pgFinalSnapshotId = `${clusterName}-cluster-final-snapshot-0`;
    const pgClusterId = `${clusterName}-cluster`;
    const rdsArgs: RdsArgs = {
        clusterName: clusterName,
        tags: tags,
        clusterId: pgClusterId,
        dbSubnetGroup: dbSubnetGroup,
        availabilityZones: [
            "us-west-2a",
            "us-west-2b",
            "us-west-2c"
        ],
        dbPort: folioDbPort,
        adminUser: pulumi.interpolate`${dbAdminUser}`,
        adminPassword: pulumi.interpolate`${dbAdminPassword}`,
        backupRetentionPeriod: 30,
        backupWindow: "07:00-09:00",
        dbVersion: "12.7",
        vpcSecurityGroupId: folioSecurityGroupId,
        finalSnapshotId: pgFinalSnapshotId,
        skipFinalSnapshot: true,
        instanceClass: "db.r6g.large",
        dependsOn: [folioVpc, dbSubnetGroup]
    };
    rdsClusterResources = postgresql.deploy.newRdsCluster(rdsArgs);
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
    dbResourceDependencies.concat([folioVpc]);
}
export const customEndpointName = pulumi.getStack();
const clusterEndpoint = new aws.rds.ClusterEndpoint(customEndpointName, {
    clusterIdentifier: dbClusterIdentifier,
    clusterEndpointIdentifier: customEndpointName,
    customEndpointType: "ANY",
    tags: { "Name": customEndpointName, ...tags },
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
    "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
];
const folioWorkerRoleName = "folio-worker-role";
const folioWorkerRole: aws.iam.Role = iam.deploy.awsRoleWithManagedPolicyAttachments
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
const nodeGroupArgs: NodeGroupArgs = {
    name: "folio-node-group",
    instanceType: aws.ec2.InstanceType.T3_XLarge,
    desiredCapacity: 4,
    minSize: 3,
    maxSize: 5,
    // On-demand are the more expensive, non-spot instances.
    labels: { "ondemand": "true" }
};
cluster.deploy.awsCreateEksNodeGroup(nodeGroupArgs, folioCluster, folioInstanceProfile);

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

// Create a secret for the opensearch dashboard username and password and deploy the chart.
// Also create the chart.
// Create a secret for folio to store our environment variables that k8s will inject into each pod.
// These secrets have been set in the stack using the pulumi command line.
var dbConnectSecretData: DynamicSecret = {
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
    OKAPI_HOST: Buffer.from("okapi").toString("base64"),
}

let searchDomainResource = <Resource>{};
let searchDomainEndpoint = <Output<string>>{};
let searchDomainEndpoint_temp = <Output<string>>{};
if (folioDeployment.hasSearch()) {
    const searchDashboardCookie = config.requireSecret("search-cookie");
    const searchUsername = config.requireSecret("search-user");
    const searchPassword = config.requireSecret("search-password");

    // Create the opensearch domain that will be needed for mod-search. Like RDS above, this is
    // created outside of the k8s cluster so that it can be managed by AWS instead of by us.
    const searchArgs: SearchDomainArgs = {
        name: "folio-search",
        fd: folioDeployment,
        vpcSecurityGroupId: folioSecurityGroupId,
        // The cluster code takes care of converting the subnet ids to outputs rather than
        // promise-wrapped outputs. Pulumi aws-native doesn't play nicely with promise-wrapped
        // outputs, unlike the other Pulumi code we're using.
        privateSubnetIds: folioCluster.core.privateSubnetIds,
        instanceType: "m5.large.search",
        instanceCount: 3,
        dedicatedMasterType: "m6g.large.search", // Smaller than instances.
        volumeSize: 20,
        masterUserUsername: searchUsername,
        masterUserPassword: searchPassword,
        awsAccountId: config.requireSecret("awsAccountId"),
        awsRegion: awsConfig.require("region"),
        clusterCidrBlock: clusterCidrBlock,
        tags: tags,
        dependsOn: [folioSecurityGroup, folioVpc, folioCluster]
    };
    const folioSearchDomain = search.deploy.domain(searchArgs);
    searchDomainResource = folioSearchDomain;
    searchDomainEndpoint = folioSearchDomain.endpoint;

    const elasticSearchPort = "443";
    dbConnectSecretData.ELASTICSEARCH_URL =
        util.base64Encode(pulumi.interpolate`https://${folioSearchDomain.endpoint}`); // mod-search readme says its depreciated but folio-helm chart requires it.
    dbConnectSecretData.ELASTICSEARCH_HOST =
        util.base64Encode(pulumi.interpolate`https://${folioSearchDomain.endpoint}`); // mod-search readme says its depreciated but folio-helm chart requires it.
    dbConnectSecretData.ELASTICSEARCH_USERNAME = util.base64Encode(pulumi.interpolate`${searchUsername}`);
    dbConnectSecretData.ELASTICSEARCH_PASSWORD = util.base64Encode(pulumi.interpolate`${searchPassword}`);
    dbConnectSecretData.ELASTICSEARCH_PORT = Buffer.from(elasticSearchPort).toString("base64"); // mod-search readme says its depreciated.

    const openSearchSecretData: DynamicSecret = {
        // Key case matters here.
        username: util.base64Encode(pulumi.interpolate`${searchUsername}`),
        password: util.base64Encode(pulumi.interpolate`${searchPassword}`),
        cookie: util.base64Encode(pulumi.interpolate`${searchDashboardCookie}`),
    };
    const searchSecretArgs: SecretArgs = {
        name: "opensearchdashboards-auth",
        labels: appLabels,
        cluster: folioCluster,
        namespace: folioNamespace,
        data: openSearchSecretData,
        //dependsOn: [folioCluster, folioNamespace, folioSearchDomain]
        dependsOn: [folioCluster, folioNamespace]
    };
    folio.deploy.secret(searchSecretArgs);
    // const searchSecret = folio.deploy.secret(searchSecretArgs);
    // const searchDashboardHelmChartArgs: SearchHelmChartArgs = {
    //     name: "folio-search-dashboard",
    //     cluster: folioCluster,
    //     namespace: folioNamespace,
    //     domainUrl: folioSearchDomain.domainEndpoint,
    //     secretArgs: searchSecretArgs,
    //     dependsOn: [folioCluster, folioNamespace, folioSearchDomain, searchSecret]
    // };
    // search.deploy.dashboardHelmChart(searchDashboardHelmChartArgs);
}
export const folioSearchDomainEndpoint = searchDomainEndpoint;
export const folioSearchDomainEndpoint_temp = searchDomainEndpoint_temp;

// Deploy the main secret which is used by modules to connect to the db. This
// secret name is used extensively in folio-helm.
const dbSecretArgs: SecretArgs = {
    name: "db-connect-modules",
    data: dbConnectSecretData,
    labels: appLabels,
    cluster: folioCluster,
    namespace: folioNamespace,
    dependsOn: [folioNamespace]
};
const dbConnectSecret = folio.deploy.secret(dbSecretArgs);

// Bucket required by mod-data-export, which is required by mod-inventory.
// The user that provides the access key and access key id is not tied to the stack
// and travels between all stacks. This user must be created manually.
const dataExportBucketName = `folio-data-export-${pulumi.getStack()}`;
const dataExportSecretAccessKey = config.requireSecret("data-export-user-secretaccesskey");
const dataExportAccessKeyId = config.requireSecret("data-export-user-accesskeyid");
const awsAccountId = config.requireSecret("awsAccountId");
const storageArgs: DataExportStorageArgs = {
    name: dataExportBucketName,
    awsAccountId: awsAccountId,
    iamUserId: "folio-data-export", // This is the username tied to the secret access key and access key id stored in the config.
    tags: tags
};
storage.deploy.s3BucketForDataExport(storageArgs);

const s3CredentialsDataExportSecretData: DynamicSecret = {
    AWS_SECRET_ACCESS_KEY: util.base64Encode(pulumi.interpolate`${dataExportSecretAccessKey}`),
    AWS_ACCESS_KEY_ID: util.base64Encode(pulumi.interpolate`${dataExportAccessKeyId}`),
    AWS_BUCKET: Buffer.from(dataExportBucketName).toString("base64"),
    AWS_REGION: util.base64Encode(pulumi.interpolate`${awsRegion}`),
    AWS_URL: Buffer.from(`https://${dataExportBucketName}.s3.amazonaws.com`).toString("base64")
};
const s3SecretArgs: SecretArgs = {
    name: "s3-credentials-data-export",
    data: s3CredentialsDataExportSecretData,
    labels: appLabels,
    cluster: folioCluster,
    namespace: folioNamespace,
    dependsOn: [folioNamespace]
}
const s3CredentialsDataExportSecret = folio.deploy.secret(s3SecretArgs);
// Note for some reason the folio-helm chart for mod-data-export-worker requires the same items
// but with a different name.
const s3CredentialSecretArgs: SecretArgs = {
    name: "s3-credentials",
    data: s3CredentialsDataExportSecretData,
    labels: appLabels,
    cluster: folioCluster,
    namespace: folioNamespace,
    dependsOn: [folioNamespace]
};
const s3CredentialsSecret = folio.deploy.secret(s3CredentialSecretArgs);

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

// Get a reference to the okapi module.
const okapiModule = util.getModuleByName("okapi", folioDeployment.modules);

// The cublctaCertArn is a wildcard certificate so there's only one ARN. This is *.cublcta.com.
export const cublCtaCertArn: string =
    "arn:aws:acm:us-west-2:735677975035:certificate/5b3fc124-0b6e-4698-9c31-504c84a979ba";
// folio.colorado.edu
export const stripesProdCertArn: string =
    "arn:aws:acm:us-west-2:735677975035:certificate/0e57ac8a-4fd5-4dbe-b8ac-d8f486798293";
// folio.colorado.edu
const okapiProdCertArn: string = "arn:aws:acm:us-west-2:735677975035:certificate/693d17a8-72b3-46b7-84f5-defe467d0896";

// Until we have a better way to cut over between environments, we need to let the stack
// control which which cert gets bound to the okapi service.
export const okapiCertArn: string = util.usesProdData(pulumi.getStack()) ? okapiProdCertArn : cublCtaCertArn;

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

// Build a list of dependencies that accounts for search, so that module installation
// will wait until search domain install is finished.
var moduleInstallDependencies: pulumi.Resource[] = [productionOkapiRelease, dbConnectSecret];
if (folioDeployment.hasSearch()) {
    // Comment in or out when deleting search domains to avoid an error.
    moduleInstallDependencies.push(searchDomainResource);
}
// Deploy the rest of the modules that we want. This excludes okapi.
const moduleReleases = folio.deploy.modules(folioDeployment.modules, folioCluster, folioNamespace,
    moduleInstallDependencies);

// These deploy with the name "platform-complete-dev or platform-complete for prod".
// These tags and containers are the result of a scripted build process. See the readme in the
// containers/folio/stripes directory for how that works.
const stripesContainerTag = `${config.require("stripes-container-tag")}`;
const stripesContainerTagDev = `dev.${config.require("stripes-container-tag")}`;
folio.deploy.stripes(false, "ghcr.io/culibraries/folio_stripes", stripesContainerTag,
    stripesProdCertArn, folioCluster, folioNamespace, [...moduleReleases]);
folio.deploy.stripes(true, "ghcr.io/culibraries/folio_stripes", stripesContainerTagDev,
    cublCtaCertArn, folioCluster, folioNamespace, [...moduleReleases]);

// Deploy the module descriptors.
folio.deploy.deployModuleDescriptors("deploy-mod-descriptors",
    folioNamespace, folioCluster, folioDeployment.modules, [...moduleReleases]);
