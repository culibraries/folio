import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";
import * as input from "@pulumi/kubernetes/types/input";

import * as vpc from "./vpc"
import * as iam from "./iam";
import * as cluster from "./cluster";
import * as kafka from "./kafka";
import * as postgresql from "./postgresql";
import * as folio from "./folio";
import * as util from "./util";

import { FolioModule } from "./classes/FolioModule";
import { FolioDeployment } from "./classes/FolioDeployment";

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
const clusterCidrBlock ="10.0.0.0/16";

// Create our VPC and security group.
const folioVpc = vpc.deploy.awsVpc("folio-vpc", tags, 3, 1, clusterCidrBlock);
export const folioVpcId = folioVpc.id;

const folioSecurityGroup = vpc.deploy.awsSecurityGroup("folio-security-group", tags, folioVpc.id, clusterCidrBlock);

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
export const folioSecurityGroupId = folioSecurityGroup.id;
export const vpcPrivateSubnetIds = folioVpc.privateSubnetIds;
export const vpcPublicSubnetIds = folioVpc.publicSubnetIds;

// Export the cluster's kubeconfig.
export const kubeconfig = folioCluster.kubeconfig;

// Create a namespace.
// You must define the provider that you want to use for creating the namespace.
export const folioNamespace = new k8s.core.v1.Namespace("folio", {}, { provider: folioCluster.provider });

// Export the namespace for us in other functions.
export const folioNamespaceName = folioNamespace.metadata.name;

// Create an object to represent the FOLIO deployment.
const releaseFilePath = "./deployments/R2-2021.yaml";
const tenant = "cubl";
const okapiUrl = "http://okapi:9130";
const loadRefData = false;
const loadSampleData = false;
const containerRepo = "folioorg";
const folioDeployment = new FolioDeployment(tenant,
    releaseFilePath,
    loadRefData,
    loadSampleData,
    okapiUrl,
    containerRepo);

// Create a configMap for folio for certain non-secret environment variables that will be deployed.
const appName = "folio";
const appLabels = { appClass: appName };

// Create a secret for folio to store our environment variables that k8s will inject into each pod.
// These secrets have been set in the stack using the pulumi command line.
const config = new pulumi.Config();

const inClusterDbHost = config.requireSecret("db-host");
const dbAdminUser = config.requireSecret("db-admin-user");
const dbAdminPassword = config.requireSecret("db-admin-password");
const dbUserName = config.requireSecret("db-user-name");
const dbUserPassword = config.requireSecret("db-user-password");

// TODO Add tags to this and other new stuff.
// TODO Make this dependent on the vpc.
const dbSubnetGroup = new aws.rds.SubnetGroup("folio-db-subnet", {
    subnetIds: folioVpc.privateSubnetIds
});

// TODO Does this need to be renamed when deleting a cluster?
// See https://github.com/hashicorp/terraform/issues/5753
export const pgFinalSnapshotId = "folio-pg-cluster-final-snapshot-0";
export const pgClusterId = "folio-pg-cluster";
const clusterName = "folio-pg";
const pgCluster = new aws.rds.Cluster(clusterName, {
    tags: tags,

    // TODO Be careful with this list. It seems to error out if 3 items aren't provided on
    // subsequent runs doing a replace because of a diff on availabilityZones. The error is:
    // error creating RDS cluster: DBClusterAlreadyExistsFault: DB Cluster already exists.
    // But I'm not seeing that it can't create in us-west-2c, because I believe we only have
    // two azs in the vpc. Making it 2 seems to work again. Ok well it will attempt
    // to replace when there are only 2 still. Adding 3 makes it not do that, which is
    // probably wrong since the vpc only has 2.

    // I believe destroying and creating the stack with 3 azs in the vpc should fix this.
    availabilityZones: [
        "us-west-2a",
        "us-west-2b",
        "us-west-2c"
    ],
    backupRetentionPeriod: 5,
    clusterIdentifier: pgClusterId,
    databaseName: "postgres",
    engine: "aurora-postgresql",
    engineVersion: "12.7",
    masterPassword: pulumi.interpolate`${dbAdminPassword}`,
    masterUsername: pulumi.interpolate`${dbAdminUser}`,
    preferredBackupWindow: "07:00-09:00",
    dbSubnetGroupName: dbSubnetGroup.name,

    // TODO Deleting the rds instance completely can be tedious with pulumi destroy.
    // Setting this property doesn't help.
    // But will setting it on create help next time we want to do pulumi destroy
    // and actually destroy the db when destroying?
    // See https://stackoverflow.com/questions/50930470/terraform-error-rds-cluster-finalsnapshotidentifier-is-required-when-a-final-s
    // Manually changing the skipFinalSnapshot values in an exported stack.json does
    // work however.
    skipFinalSnapshot: true,
    finalSnapshotIdentifier: pgFinalSnapshotId,

    // This is necessary, otherwise it will bind the rds cluster to the default security
    // group.
    vpcSecurityGroupIds: [ folioSecurityGroup.id ],
});
const clusterInstances: aws.rds.ClusterInstance[] = [];
for (const range = { value: 0 }; range.value < 2; range.value++) {
    clusterInstances.push(new aws.rds.ClusterInstance(`folio-pg-cluster-instance-${range.value}`, {
        tags: tags,
        identifier: `folio-pg-cluster-instance-${range.value}`,
        clusterIdentifier: pgCluster.id,
        instanceClass: "db.r6g.large",
        engine: "aurora-postgresql",
        engineVersion: "12.7",
        dbSubnetGroupName: dbSubnetGroup.name
    }));
}

export const folioDbHost = pgCluster.endpoint;
export const folioDbPort = pgCluster.port;

const configMapData = {
    DB_PORT: "5432",
    DB_DATABASE: "folio",
    DB_QUERYTIMEOUT: "60000",
    DB_CHARSET: "UTF-8",
    DB_MAXPOOLSIZE: "5",
    // TODO Add KAFKA_HOST, KAFKA_PORT
};
const configMap = folio.deploy.configMap("default-config",
    configMapData, appLabels, folioCluster, folioNamespace,
    [folioNamespace]);

var secretData = {
    //DB_HOST: util.base64Encode(pulumi.interpolate`${dbHost}`),
    DB_HOST: util.base64Encode(folioDbHost),
    DB_USERNAME: util.base64Encode(pulumi.interpolate`${dbUserName}`),
    DB_PASSWORD: util.base64Encode(pulumi.interpolate`${dbUserPassword}`),

    // It would appear that folio-helm wants this in this secret rather than the configMap.
    DB_PORT: Buffer.from("5432").toString("base64"),

    // TODO These three variables are present in the rancher envs, but they
    // don't reach the pods because of code like this:
    // https://github.com/folio-org/folio-helm/blob/ca437e194c2385867e5147d924664ac5dd8f06f0/mod-users/templates/deployment.yaml#L40
    // However they may be quite important (especially the timeout one) considering
    // the timeout errors that we are seeing. For the importance of this variable also see:
    // https://github.com/folio-org/mod-permissions/blob/b0dee51ff94bfe8c3502fdc89c71d452b3889287/descriptors/ModuleDescriptor-template.json
    // Postgres also has statement_timeout and lock_timeout both of which appear to be
    // 0 in our deployment which I believe means they are not limited.
    // See https://www.postgresql.org/docs/12/runtime-config-client.html.
    DB_MAXPOOLSIZE: Buffer.from("5").toString("base64"),
    DB_QUERYTIMEOUT: Buffer.from("60000").toString("base64"),
    DB_CHARSET: Buffer.from("UTF-8").toString("base64"),

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
    GRAILS_SERVER_PORT: Buffer.from("8080").toString("base64")
};

// // Deploy the main secret which is used by modules to connect to the db. This
// // secret name is used extensively in folio-helm.
const secret = folio.deploy.secret("db-connect-modules", secretData, appLabels, folioCluster,
    folioNamespace, [folioNamespace]);

// NOTE We are currently using pulumi's helm Release rather than helm Chart.
// See: https://www.pulumi.com/registry/packages/kubernetes/api-docs/helm/v3/release/.
// Although using Release produces a warning when running pululmi up, Release is much
// more robust than Chart, especially when it comes to waiting on the deployment
// and chaining to subsequent operations via dependsOn.

// Deploy Kafka via a Helm Chart into the FOLIO namespace.
export const kafkaInstance = kafka.deploy.helm("kafka", folioCluster, folioNamespace,
    [folioNamespace]);

//This can run multiple times without causing trouble.
// export const inClusterPostgres = postgresql.deploy.helm("in-cluster-postgres", folioCluster,
//     folioNamespace, dbAdminPassword, [folioNamespace, secret]);

// This can run multiple times without causing trouble. It depends on the result of
// all resources in the previous step being complete.
const dbCreateJob = postgresql.deploy.databaseCreation
    ("create-database",
     folioNamespace,
     folioCluster,
     pulumi.interpolate`${dbAdminUser}`,
     pulumi.interpolate`${dbAdminPassword}`,
     pulumi.interpolate`${dbUserName}`,
     pulumi.interpolate`${dbUserPassword}`,
     folioDbHost,
     "postgres",
     [folioNamespace, pgCluster, ...clusterInstances]);

// // Prepare the list of modules to deploy.
const modules: FolioModule[] = folio.prepare.moduleList(folioDeployment);

// Get a reference to the okapi module.
const okapi: FolioModule = util.getModuleByName("okapi", modules);

// TODO Get this from a configuration entry.
// TODO This is currently the ARN of the cublcta.com domain.
const certArn:string = "arn:aws:acm:us-west-2:735677975035:certificate/5b3fc124-0b6e-4698-9c31-504c84a979ba";

// Deploy okapi first, being sure that other dependencies have deployed first.
// TODO Add the dbCreateJob back in here as a dep.
const okapiRelease: k8s.helm.v3.Release = folio.deploy.okapi(okapi, certArn, folioCluster,
    folioNamespace, [pgCluster, ...clusterInstances, secret, configMap, kafkaInstance, dbCreateJob]);

// Deploy the rest of the modules that we want. This excludes okapi.
const moduleReleases = folio.deploy.modules(modules, folioCluster, folioNamespace, okapiRelease);

// Prepare a list of containers which will perform the module registration in sequence.
const registrationInitContainers: input.core.v1.Container[] =
    folio.prepare.moduleRegistrationInitContainers(modules);

// Run the module registration containers as init containers for the final create/
// update super user job. This final job will attempt to create the
// the superuser, applying all permissions to it if the deployment configuration
// has createSuperuser set to true. If the deployment configuration has createSuperuser
// set to false, this will apply all permissions to the superuser.
const superUserName = config.requireSecret("superuser-name");
const superUserPassword = config.requireSecret("superuser-password");
const modRegistrationJob = folio.deploy.registerModulesAndBootstrapSuperuser
    ("mod-reg-and-bootstrap-superuser",
    pulumi.interpolate`${superUserName}`,
    pulumi.interpolate`${superUserPassword}`,
    folioDeployment,
    folioNamespace,
    folioCluster,
    registrationInitContainers,
    moduleReleases);

// NOTE This deploys with the name "platform-complete".
folio.deploy.stripes("ghcr.io/culibraries/folio_stripes", "2021.r2.2", certArn,
    folioCluster, folioNamespace, [modRegistrationJob])

// // TODO Determine if the Helm chart takes care of the following:
// // Create hazelcast service account
// // Create hazelcast configmap
