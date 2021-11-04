This is a container intended to be deployed to the FOLIO cluster to be used for debugging.

See the Dockerfile to see what it installs.

To build and run the container locally:
```
docker build . --tag folio_debug:latest
docker run -it folio_debug:latest sh
```

To push any changes to this container to our github package hub:
```
```

Lots of resources on debugging kubernetes clusters is here:
https://kubernetes.io/docs/tasks/debug-application-cluster/

