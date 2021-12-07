# Pulumi for deploying AWS and Kubernetes resources

This is a typescript [pulumi](https://www.pulumi.com/docs) project. Pulumi is both a command line interface and a set of APIs for building cloud resources with code. This project was created using the `pulumi new aws-typescript` command. This project is mostly about using pulumi to build things in kubernetes backed by AWS.

## Setting up your environment

To install a different version of node use the node version manager (nvm). Follow [these install instructions](https://github.com/nvm-sh/nvm#installing-and-updating) rather than using Homebrew if you are on a mac. Make sure to restart your terminal then do `nvm --help` to see some help. To install a specific version on node do `nvm install <your version>` then do `nvm use <yourversion>`.

* node 17.0.1
* npm 8.1.0 (should be installed with 17.0.1)

You need both pulumi and the [AWS Command Line Interface(CLI) tool](https://docs.aws.amazon.com/cli/latest/userguide/installing.html) installed locally to do development or run pulumi. You can use [Homebrew](https://brew.sh/) to install these tools on OSX:

```sh
brew install pulumi
brew install awscli
```

### Configuring the AWS cli

Set some environment variables so that the AWS cli can authenticate you.

```sh
export AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID> && export AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_ACCESS_KEY>
```

**Both pulumi and the aws cli will prompt you when a new version is available and give you instructions for how to upgrade. Please do this routinely.**

### Install the node dependencies

Clone this repo then run `npm install` in the `pulumi/folio` directory. We are sticking to npm for this project and not using yarn.

## Pulumi

### Stacks

Stacks are a set of resources to run a cloud application. For example there is a stack called `dev`. Other stacks might include `staging` and `production`.

#### Stack state

Stacks have state which we store in a s3 bucket so that multiple developers can share state. There is no need to login to anything from app.pulumi.com, everything we need is stored in s3.

You need to be given permission to write to this bucket by getting added to the AWS Identity and Access Management (IAM) User Group `cubl-pulumi`. You can use the AWS CLI to test your access:

```sh
# When user is in group this will upload and download an image
$ aws s3api put-object --bucket cubl-pulumi --key batman.jpg --body ~/Downloads/Images/batman_logo.jpg
$ aws s3api get-object --bucket cubl-pulumi --key batman.jpg Output.jpg
```

For more information about using s3 as a backend see [the pulumi documentation on storing state](https://www.pulumi.com/docs/intro/concepts/state/#logging-into-the-AWS-s3-backend). We want to store each stack in a separate directory for its project like this:

```txt
cubl-pulumi/folio/dev/.pulumi
```

**When creating a new stack, check the s3 bucket to make sure it is ending up in a project directory like other stacks.**

## Deploying a Stack

### Configure your local workstation

1. Logging into a stack

    Once logged in you can change the code for the stack and redeploy it. The state for the `dev` stack can be logged into like this:

    ```sh
    pulumi login s3://cubl-pulumi/folio/dev
    ```

1. Setting the PULUMI_CONFIG_PASSPHRASE

    Export this environment variable on your local system for the stack that you are working on. Each stack has its own passphrase. This passphrase is located in KeePass. To export it do:

    ```sh
    export PULUMI_CONFIG_PASSPHRASE=<PULUMI_CONFIG_PASSPHRASE>
    ```

### Listing and selecting a stack

Run `pulumi stack ls` to list stacks. The asterisk indicates which stack is currently selected. You can select another stack with `pulumi stack select <stack>`

```sh
$ pulumi stack ls
NAME                                      LAST UPDATE              RESOURCE COUNT
staging*                                  n/a                      n/a
test                                      2 weeks ago              121

$ pulumi stack select test
NAME                                      LAST UPDATE              RESOURCE COUNT
staging                                   n/a                      n/a
test*                                     2 weeks ago              121
```

### Interacting with Pulumi Configuration

```sh
# Show all pulumi configuration including secrets in plaintext
$ pulumi config  --show-secrets
KEY                VALUE
aws:region         us-west-2
awsAccountId       123456789
db-admin-password  adminpass
db-admin-user      adminuser
db-host            test.host
db-user-name       user
db-user-password   password

# Set (or re-set) a configuration value
$ pulumi config set db-host postgresql --secret
```

### Deploy a stack

Run `pulumi up` to create or update a stack.

### Connect to AWS and Kubernetes

1. Get the kubeconfig file from pulumi.

    Update your kubeconfig file with one that will give you access to the cluster:

    ```sh
    pulumi stack output kubeconfig > ~/.kube/my_special_config
    export KUBECONFIG=~/.kube/my_special_config
    ```

2. Assuming a role. You should consider doing this in a separate terminal session because Pulumi uses your AWS credentials and `kubectl` needs to use the assumed role.

    TODO Export the role name so that it's in the stack state.

    TODO Explain how to get the role name from pulumi.

    If you didn't create the cluster you'll need to assume the role associated with it. You need to get the role ARN.

    ```sh
    aws iam list-roles --query "Roles[?RoleName == '<role name>'].[RoleName, Arn]"
    ```

    Now assume the role:

    ```sh
    aws sts assume-role --role-arn "<role arn>" --role-session-name AWSCLI-Session
    ```

    This will output new temporary credentials. Set them in your env. You'll unset them later.

    ```sh
    export AWS_ACCESS_KEY_ID=<the role access key id>
    export AWS_SECRET_ACCESS_KEY=<the role secret access key>
    export AWS_SESSION_TOKEN=<the session token>
    ```

    To check that you've assumed the role:

    ```sh
    aws sts get-caller-identity
    ```

    You should now see the details of the role you've assumed. And then this should work:

    ```sh
    kubectl get nodes
    ```

    To stop assuming the role do:

    ```sh
    unset AWS_ACCESS_KEY_ID
    unset AWS_SESSION_TOKEN
    unset AWS_SECRET_ACCESS_KEY
    ```

    The aws cli will still work because it doesn't store credentials.

### Cleaning up

To clean up resources run `pulumi destroy`.

This will destroy all the resources that are running. There's no need to do this on every run. As mentioned above pulumi will take care of applying patches when the code changes. The only reason to destroy is if you truly want to take down the AWS resources consumed by the stack.

## Notes

### Public and private subnets

This stack creates both a private and a public subnet. The workloads are deployed to the private subnet. The public subnet is for resources which provide access to the cluster.

To verify that the deployed nodes and pods are running on the private subnet:

```sh
$ pulumi stack output vpcPrivateSubnetIds
["subnet-074a56c97569606cb","subnet-0e90054cecae748d6"]
$ AWS ec2 describe-network-interfaces --filters Name=subnet-id,Values=subnet-074a56c97569606cb |jq -r '.NetworkInterfaces[].PrivateIpAddress' |sort
10.0.136.181
10.0.163.119
10.0.177.37
$ AWS ec2 describe-network-interfaces --filters Name=subnet-id,Values=subnet-0e90054cecae748d6 |jq -r '.NetworkInterfaces[].PrivateIpAddress' |sort
10.0.196.201
10.0.199.189
10.0.254.163
$ kubectl get nodes
NAME                                         STATUS   ROLES    AGE   VERSION
ip-10-0-136-181.us-west-2.compute.internal   Ready    <none>   74m   v1.21.4-eks-033ce7e
ip-10-0-177-37.us-west-2.compute.internal    Ready    <none>   74m   v1.21.4-eks-033ce7e
ip-10-0-199-189.us-west-2.compute.internal   Ready    <none>   74m   v1.21.4-eks-033ce7e
ip-10-0-254-163.us-west-2.compute.internal   Ready    <none>   74m   v1.21.4-eks-033ce7e
$ kubectl get pods -o wide
NAME          READY   STATUS    RESTARTS   AGE   IP             NODE                                         NOMINATED NODE   READINESS GATES
folio-debug   1/1     Running   0          39m   10.0.221.166   ip-10-0-199-189.us-west-2.compute.internal   <none>           <none>
```

## Debugging

### Recovering from stack state de-sync

It is possible to find yourself in a situation where the stack state and the state of deployed resources are out of sync. When this happens you will see messages like this and basically pulumi refuses to do anything (`pulumi up` etc stop working):

```txt
error: .pulumi\stacks\ml-cluster.json: snapshot integrity failure; refusing to use it: resource urn:pulumi:ml-cluster::ml-cluster::azure-nextgen:containerservice/latest:ManagedCluster$kubernetes:core/v1:Namespace::apps refers to unknown provider urn:pulumi:ml-cluster::ml-cluster::pulumi:providers:kubernetes::provider::4299278d-f00b-4efe-b1f1-ee7f0040b1c8
```

The solution is to do the following to remove the resource that the stack things should exist but doesn't:

1. Run `pulumi state delete 'urn:pulumi:ml-cluster::ml-cluster::azure-nextgen:containerservice/latest:ManagedCluster$kubernetes:core/v1:Namespace::apps' --disable-integrity-checking` where you replace the urn with the one pulumi complains about. **Pay careful attention to the single quotes. Don't use double. Using double will cause it to say the resource wasn't found.**
1. Repeat the above if it gives you other resources.
1. Do `pulumi refresh`. This will synch the cloud resources with your state.
1. Run `pulumi up` or `pulumi destroy` depending on your needs.

The [pulumi troubleshooting doc](https://www.pulumi.com/docs/troubleshooting/#interrupted-update-recovery) also has other ideas for when other things go wrong.

Generally try not to rename too many resources at once or do massive changes to a stack all in one go. Instead if you know you're going to do this, consider doing a `pulumi destroy` and then `pulumi up` instead. Sometimes this may not be possible, but it may save you some headaches if you can.

### Authentication issues

Errors like `SignatureDoesNotMatch: The request signature we calculated does not match the signature you provided` may be related to your authentication status with AWS. Verify that you are **not** using the `aws sts` temporary credentials.

### Helm Charts

```log
error: Running program '/Users/jafu6031/repos/folio/pulumi/folio' failed with an unhandled exception:
  Error: invocation of kubernetes:helm:template returned an error: failed to generate YAML for specified Helm chart: failed to pull chart: chart "bitnami/kafka" version "14.2.3" not found in https://charts.bitnami.com/bitnami repository
```

This can mean that your local helm repo is out of data and doesn't have the latest charts. Try running `helm repo update`.

## References

* [Assume an IAM role using the AWS CLI](https://aws.amazon.com/premiumsupport/knowledge-center/iam-assume-role-cli/)
* [Provide access to other IAM users and roles after cluster creation](https://aws.amazon.com/premiumsupport/knowledge-center/amazon-eks-cluster-access/)
