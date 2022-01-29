#!/usr/bin/env bash

# This URL has to be available. Port forwarding won't work here.
OKAPI_URL="https://folio-iris-okapi.cublcta.com:9130"
FLAGS="--only-perms"
USER="$UN"
PASSWORD="$PW"

echo "Bootstrapping superuser $USER"

docker run --rm -e TENANT_ID=cubl -e ADMIN_USER=$USER -e ADMIN_PASSWORD=$PASSWORD -e FLAGS=$FLAGS -e OKAPI_URL=$OKAPI_URL folioci/bootstrap-superuser
