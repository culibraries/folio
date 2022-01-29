#!/usr/bin/env bash

# The container used is here:
# https://github.com/folio-org/folio-helm/tree/master/docker/bootstrap-superuser

# TODO Doing this outside of the cluster is not ideal since it means that the cluster
# is exposed before it is done.
# This URL has to be available. Port forwarding won't work here.
OKAPI_URL="https://folio-iris-okapi.cublcta.com:9130"
# The first time you run this for a deployment, comment this out.
# Any subsequent times (like after installing a module), comment it in.
#FLAGS="--only-perms"
USER="$UN"
PASSWORD="$PW"

echo "Bootstrapping superuser $USER"

docker run --rm -e TENANT_ID=cubl -e ADMIN_USER=$USER -e ADMIN_PASSWORD=$PASSWORD -e FLAGS=$FLAGS -e OKAPI_URL=$OKAPI_URL folioci/bootstrap-superuser
