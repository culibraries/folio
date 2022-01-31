#!/usr/bin/env bash

OKAPI_URL="http://localhost:9000"
TENANT_ID="cubl"
CURL="curl -w\n -D - "
IGNORE_ERRORS="false"
REF_DATA="true"
SAMPLE_DATA="false"
DEPLOYMENT="R2-2021"

H_JSON="-HContent-type:application/json"

# If you need to run this after mod-authtoken has been enabled you will need this.
#H_TOKEN="-HX-Okapi-Token:$TOKEN" # Don't paste here bc you will forget you did!
# Don't pass in the tenant header when registering modules before mod-authtoken
# is enabled.
#H_TENANT="-HX-Okapi-Tenant:$TENANT_ID"

# Can only do this request if mod-authtoken isn't enabled.
# This takes a good two or three minutes to run on a full install with load
# sample as false and load ref true.
$CURL $H_JSON --progress-bar \
  -X POST \
  -d@../deployments/$DEPLOYMENT.json \
  $OKAPI_URL/_/proxy/tenants/$TENANT_ID/install?deploy=false\&preRelease=false\&ignoreErrors=$IGNORE_ERRORS\&tenantParameters=loadSample%3D$SAMPLE_DATA%2CloadReference%3D$REF_DATA
