#!/usr/bin/env bash

# Use this to test out a user like the usperuser after it has been created. If all
# goes well you should get back a token. Note the URL. You may want to port
# forward to the custer's okapi to your localhost on port 9000.
# You also must export the the two environment variables UN and PW
# into your local env. Those are values are avalable to you if you do
# pulumi config --show secrets for the superuser.

#OKAPIURL="https://folio-iris-okapi.cublcta.com:9130"
OKAPIURL="http://localhost:9000"
CURL="curl -w\n -D - "

H_TENANT="-HX-Okapi-Tenant:cubl"
H_JSON="-HContent-type:application/json"

echo $OKAPIURL

# Will print the tokent to stdout. Don't cat it to a file!
$CURL $H_TENANT $H_JSON --progress-bar \
  -X POST \
  --data '{"username":"'$UN'","password":"'$PW'"}' \
  $OKAPIURL/authn/login
