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
aws eks --region us-west-2 update-kubeconfig --name $(pulumi stack output cluster-name)
```

To see the nodes:

```
kubectl get nodes
```

To clean up resources:

```
pulumi destroy
```

