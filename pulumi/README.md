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
    aws iam list-roles
    # In the response use `/folio-cluster-admin-role` to find the associated role and note the `Arn`
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

This operation may not always work as expected. When things go wrong do `pulumi destroy --help` to get a sense of your options. Refreshing the stack's state before destroying has been known to help. Also setting the debug flag is never a bad idea. To do both of these things try `pulumi destroy -r -d`.

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

### Helm charts

```log
error: Running program '/Users/jafu6031/repos/folio/pulumi/folio' failed with an unhandled exception:
  Error: invocation of kubernetes:helm:template returned an error: failed to generate YAML for specified Helm chart: failed to pull chart: chart "bitnami/kafka" version "14.2.3" not found in https://charts.bitnami.com/bitnami repository
```
This can mean that your local helm repo is out of data and doesn't have the latest charts. Try running `helm repo update`.

#### Common error messages when working with helm
This deployment makes heavy use of helm. It is easy to have what helm knows about the deployment and what pulumi knows about it get out of sync. Usually this is easy to fix.

If you see: ```error: cannot re-use a name that is still in use``` it likely means that helm still thinks that the given resource still exists even though it doesn't on the cluster.

Pulumi will likely tell you what module is the culprit. You can remove it by doing:

```shell
helm delete <chart name> --namespace <kubernetes namespace>
```

And then re-run `pulumi up`. When synchronization between the actual deployment and pulumi state is an issue, running `pulumi refresh` will often help.

#### When helm deployments fail
Often when first deploying something via helm via pulumi, the deployment may fail. If this is the case, you may consider commenting out the deployment in the `index.ts` file to remove the resource before trying to redeploy. But often pulumi will be unable to remove the resource that is in the failed state. If this is the case you can be comfortable removing the resource directly with helm:

```shell
helm delete <name> --namespace <kubernetes namespace>
```

## Working with jobs
We are using kubernetes jobs in a number of places:
* To run certain database operations
* To register modules with okapi
* To create or update the superuser

These jobs hang around after they are run. We could set `ttlSecondsAfterFinished` and have them disappear after a time. This has a number of downsides. One is that the logs for the job, which are present in the pod that is created as part of the job, also disappear. Diagnosing problems is much easier if the logs hang around.

Jobs that have run and completed do not consume resources.

Once a job has run successfully, as far as pulumi is concerned, it is done and won't be run again, unless it is removed. This makes jobs that should run on every change to the cluster somewhat hard to manage. Our job that creates or updates the superuser ideally would run after any new modules were added or removed. To make this happen, you have to manually remove the job either by commenting it out of index.ts, or deleting it with helm and removing it from the state with `pulumi state delete <urn>`.

The idea of jobs that run every time `pulumi up` runs is a bit foreign to pulumi. As a workaround we may want to script our invocation of pulumi and do `pulumi destroy --target <job to destroy>` to first remove a resource before running `pulumi up`.

## Connecting to the cluster before it is exposed
It is highly useful to be able to connect to okapi before it is exposed. Do this by port forwarding your localhost to okapi.

```shell
kubectl -n <namespace> port-forward <okapi pod name> 9000:9130
```
Then try: `curl http://localhost:9000/_/proxy/tenants/cubl/modules` to see what modules have been successfully enabled for the tenant.

## Hooking up a custom domain and SSL
Okapi and stripes are each open to the outside world through a k8s LoadBalancer service. Okapi is exposed on port 9130 which is important because that's where in-cluster requests to okapi expect it to be. Stripes is exposed on port 443. These load balancer services each receive an external hostname which is available when you do `describe service`. Hitting this domain directly will time out since each LoadBalancer has annotations which enforce SSL, which requires a certificate.

These are the steps for getting it all to work:
1. Get the ARN of the certificate you wish to use from the AWS certificate manager.
2. Assign this to the variable in index.ts for the cert ARN.
3. Redeploy by running `pulumi up`. The kubernetes deployments that use this ARN will update. Verify this by doing `describe service`. The annotation should now contain the cert ARN.
4. Go to route 53 in the AWS console.
5. Click on Hosted Zones and add an entry in cublcta.com like folio-iris.cublcta.com. Add a second one for okapi.
6. Paste the host from each k8s service that you got when doing `describe service` in the Value field of each hosted zone entry.
7. Choose CNAME for record type.
8. Rebuild the stripes container with the new okapi URL. See the Dockerfile and the `OKAPI_URL` variable there. See the instructions for building this container in /containers/folio/stripes.
9. Change the tag in index.js for this container. Run `pulumi up`. Verify that the correctly tagged container is loaded in the pod by doing `describe pod`.

### Using a colorado.edu domain
DNS for a colorado.edu domain isn't handled through our account's route 53. We do however manage the certificate in ACM for these subdomains so the ARN for <our subdomain>.colorado.edu is in ACM. Setting up the DNS record with campus OIT to this colorado.edu subomain will need to be similar to what we do for cublcta.com.

### Swapping out deployments
TODO Changing the route 53 or the DNS entry that is mapping to the two LoadBalancer endpoints should be all that is necessary. However, for this type of swap to work, we would need for the stripes okapi url to detect this change update automatically.

## References
* [Assume an IAM role using the AWS CLI](https://aws.amazon.com/premiumsupport/knowledge-center/iam-assume-role-cli/)
* [Provide access to other IAM users and roles after cluster creation](https://aws.amazon.com/premiumsupport/knowledge-center/amazon-eks-cluster-access/)
