This readme will cover working with the FOLIO pulumi project. The FOLIO palumi project will cover all of the deployment steps (the stack) from end-to-end for a fully functioning FOLIO system.

This is a python pulumi project created with the aws python template via `pulumi new`.

There is currently one stack called `dev`. Other stacks can be added, like `staging` and `production`. This state for the `dev` stack can be logged into like this:

```
pulumi login s3://cubl-pulumi/folio/dev
```

When deploying the stack state for the project is created like this:

```
cubl-pulumi/folio/dev/.pulumi
```