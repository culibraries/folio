This is a typescript [pulumi](https://www.pulumi.com/docs) project. Pulumi is both a command line interface and a set of APIs for building cloud resources with code. This project was created using the `pulumi new AWS-typescript` command. This project is mostly about using pulumi to build things in kubernetes backed by AWS.

# Setting up your environment
You need both pulumi and the AWS cli installed locally to develop this. If you're on a mac do:
```
brew install pulumi
brew install awscli
```

## Configuring the AWS cli
Set some environment variables so that the AWS cli can authenticate you.
```
export AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID> && export AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_ACCESS_KEY>
```

## Other Requirements
* node 17.0.1
* npm 8.1.0 (should be installed with 17.0.1)
* pulumi - latest
* awscli - latest

Both pulumi and the aws cli will prompt you when a new version is available and give you instructions for how to upgrade. Please do this.

## Installing requirements
To install a different version of node use the node version manager (nvm). Follow [these install instructions](https://github.com/nvm-sh/nvm#installing-and-updating) rather than using brew if you are on a mac. Make sure to restart your terminal then do `nvm --help` to see some help. To install a specific version on node do `nvm install <your version>` then do `nvm use <yourversion>`.

## Install the code
Clone this repo then run `npm install` in the `pulumi/folio` directory. Let's stick to npm for this project and not use yarn.

## Stacks
Stacks are a set of resources to run a cloud application. For example there is a stack called `dev`. Other stacks might include `staging` and `production`.

## Stack state
Stacks have state. Our stack states are stored in our s3 bucket. There is no need to login to anything from app.pulumi.com. Everything we need is stored in s3. You need to be given permission to write to this bucket.

## Logging into a stack
The state for the `dev` stack can be logged into like this: `pulumi login s3://cubl-pulumi/folio/dev`. Once logged in you can change the code for the stack and redeploy it.

## Stacks and projects in our s3 bucket
For more information about using s3 as a backend see [the pulumi docuumentation on storing state](https://www.pulumi.com/docs/intro/concepts/state/#logging-into-the-AWS-s3-backend). Each stack is stored in s3 in a separate directory for its project like this:
```
cubl-pulumi/folio/dev/.pulumi
```
**When creating a new stack, check the s3 bucket to make sure it is ending up in a project directory like other stacks.**

## Setting the PULUMI_CONFIG_PASSPHRASE
Export this environment variable on your local system for the stack that you are working on. Each stack has its own passphrase. This passphrase is located in keypass. To export it do:
```
export PULUMI_CONFIG_PASSPHRASE=<PULUMI_CONFIG_PASSPHRASE>
```

You are now ready to deploy the stack.

# Stack deployment
To deploy the stack and test things out after you have configured your local workstation run `pulumi up`. Use the same command to update the stack after any changes. Pulumi will take care of previewing what has changed and only apply the differences to whatever has already been deployed.

## Connecting
Connecting is two steps.
1. Get the kubeconfig file from pulumi.
2. Assuming a role.

### Getting the kubeconfig file
After you've deployed something you probably want to get access to it. To update your kubeconfig file with one that will give you access to the cluster:
```
pulumi stack output kubeconfig > ~/.kube/config
```

If you want to put the kubeconfig file someplace else set the env var like this. Just remember to not commit it to the repo! Maybe something like:
```
export KUBECONFIG=~/.kube/my_special_config
```
### Connecting to the cluster

TODO Export the role name so that it's in the stack state.

TODO Explain how to get the role name from pulumi.

If you didn't create the cluster you'll need to assume the role associated with it. You need to get the role ARN.
```
aws iam list-roles --query "Roles[?RoleName == '<role name>'].[RoleName, Arn]"
```
Now assume the role:
```
aws sts assume-role --role-arn "<role arn>" --role-session-name AWSCLI-Session
```
This will output new temporary credentials. Set them in your env. You'll unset them later.

```
export AWS_ACCESS_KEY_ID=<the role access key id>
export AWS_SECRET_ACCESS_KEY=<the role secret access key>
export AWS_SESSION_TOKEN=<the session token>
```

To check that you've assumed the role:
```
aws sts get-caller-identity
```
You should now see the details of the role you've assumed. And then this should work:
```
kubectl get nodes
```
To stop assuming the role do:
```
unset AWS_ACCESS_KEY_ID
unset AWS_SESSION_TOKEN
unset AWS_SECRET_ACCESS_KEY
```
The aws cli will still work because it doesn't store credentials 

### References
* https://aws.amazon.com/premiumsupport/knowledge-center/iam-assume-role-cli/
* https://aws.amazon.com/premiumsupport/knowledge-center/amazon-eks-cluster-access/

## Cleaning up

To clean up resources do `pulumi destroy`.

This will destroy all the resources that are running. There's no need to do this on every run. As mentioned above pulumi will take care of applying patches when the code changes. The only reason to destroy is if you truly want to take down the AWS resources consumed by the stack.

# Public and private subnets
This stack creates both a private and a public subnet. The workloads are deployed to the private subnet. The public subnet is for resources which provide access to the cluster.

To verify that the deployed nodes and pods are running on the private subnet:
```
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
