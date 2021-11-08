This is a container intended to be deployed to the FOLIO cluster to be used for debugging.

See the Dockerfile to see what it installs.

To build and run the container locally:
```
docker build . --tag folio_debug:latest
docker run -it folio_debug:latest sh
```

To push any changes to this container to our github package hub:
1. Get a Personal Access Token
2. Export it to your env
3. Login
4. Push to it

```
export CR_PAT=YOUR_TOKEN
docker build . --tag ghcr.io/culibraries/folio_debug:latest
echo $CR_PAT | docker login ghcr.io -u USERNAME --password-stdin
docker push ghcr.io/culibraries/folio_debug:latest
```
For instructions for how to auth to the container registry see:
* https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
* https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry

# How to use this container

Once this container is deployed in the cluster, you can connect to it like this:

```shell
# Deploy the container
$ kubectl apply -f containers/debug/folio-debug.yaml
pod/folio-debug created
# Connect to the container and get a shell
$ kubectl exec --stdin --tty folio-debug -- /bin/sh
/ #
```

For more info see: https://kubernetes.io/docs/tasks/debug-application-cluster/get-shell-running-container/

# Resources on debugging k8s

Lots of resources on debugging kubernetes clusters is here:
https://kubernetes.io/docs/tasks/debug-application-cluster/

