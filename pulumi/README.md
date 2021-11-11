This is a python pulumi project created with the aws python template via `pulumi new`.

There is currently one stack called `dev`. Other stacks can be added, like `staging` and `production`. This state for the `dev` stack can be logged into like this:

```
pulumi login s3://cubl-pulumi/folio/dev
```

When deploying the stack state for the project is created like this:

```
cubl-pulumi/folio/dev/.pulumi
```

To deploy:

```
pulumi up
```

To update your kubeconfig file with one that will give you access to the cluster:

```
pulumi stack output kubeconfig > ~/.kube/config
```
If you want to put the kubeconfig file someplace else set the env var like this. Just remember to not commit it to the repo! Maybe something like:
```
export KUBECONFIG=~/.kube/my_special_config
```

To see the nodes:

```
kubectl get nodes
```

To clean up resources:

```
pulumi destroy
```

To verify that the deployed nodes and pods are running on the private subnet:

```
$ pulumi stack output vpcPrivateSubnetIds
["subnet-074a56c97569606cb","subnet-0e90054cecae748d6"]
$ aws ec2 describe-network-interfaces --filters Name=subnet-id,Values=subnet-074a56c97569606cb |jq -r '.NetworkInterfaces[].PrivateIpAddress' |sort
10.0.136.181
10.0.163.119
10.0.177.37
$ aws ec2 describe-network-interfaces --filters Name=subnet-id,Values=subnet-0e90054cecae748d6 |jq -r '.NetworkInterfaces[].PrivateIpAddress' |sort
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
