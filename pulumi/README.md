This is a typescript [pulumi](https://www.pulumi.com/docs) project. Pulumi is both a command line interface and a set of APIs for building cloud resources with code. This project was created using the `pulumi new AWS-typescript` command. This project is mostly about using pulumi to build things in kubernetes backed by AWS.

# Getting started
You need both pulumi and the AWS cli installed locally to develop this. If you're on a mac do:

```
brew install pulumi
brew install awscli
```

# Configuring the AWS cli
Set some environment variables so that the AWS cli can authenticate you.
```
export AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID> && export AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_ACCESS_KEY>
```

# Stacks
Stacks are a set of resources to run a cloud application. For example there is a stack called `dev`. Other stacks might include `staging` and `production`.

## Stack state
Stacks have state. Our stack states are stored in our s3 bucket. There is no need to login to anything from app.pulumi.com. Everything we need is stored in s3. You need to be given permission to write to this bucket.

## Logging into a stack
The state for the `dev` stack can be logged into like this: `pulumi login s3://cubl-pulumi/folio/dev`. Once logged in you can change the code for the stack and redeploy it.

## Stacks and projects in our s3 bucket
For more information about using s3 as a backend for pulumi see [this doc](https://www.pulumi.com/docs/intro/concepts/state/#logging-into-the-AWS-s3-backend). Each stack is stored in s3 in a separate directory for its project like this:
```
cubl-pulumi/folio/dev/.pulumi
```
**When creating a new stack, check the s3 bucket to make sure it is ending up in a project directory like other stacks.**

# Deployment
To deploy the stack and test things out after you have configured your local workstation run `pulumi up`. Use the same command to update the stack after any changes. Pulumi will take care of previewing what has changed and only apply the differences to whatever has already been deployed.

# Connecting to the cluster
After you've deployed something you probably want to get access to it. To update your kubeconfig file with one that will give you access to the cluster:
```
pulumi stack output kubeconfig > ~/.kube/config
```

If you want to put the kubeconfig file someplace else set the env var like this. Just remember to not commit it to the repo! Maybe something like:
```
export KUBECONFIG=~/.kube/my_special_config
```

To see the nodes run `kubectl get nodes`.

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
