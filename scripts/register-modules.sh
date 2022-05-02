#!/usr/bin/env bash

DEPLOYMENT="R3-2021"
OKAPI_URL="http://localhost:9000"
echo "Okapi url is $OKAPI_URL. Make sure you have port forwarded to that address."
TENANT_ID="cubl"
echo "Installing modules for tenant: $TENANT_ID"
CURL="curl -w\n -D - "
IGNORE_ERRORS="false"
REF_DATA="true"
SAMPLE_DATA="true"
echo "Loading ref data: $REF_DATA"
echo "Loading sample data: $SAMPLE_DATA"

H_JSON="-HContent-type:application/json"

# If you need to run this after mod-authtoken has been enabled you will need this.
#H_TOKEN="-HX-Okapi-Token:$TOKEN" # Don't paste here bc you will forget you did!
# Don't pass in the tenant header when registering modules before mod-authtoken
# is enabled.
#H_TENANT="-HX-Okapi-Tenant:$TENANT_ID"

# Remove modules that have the action "disable" since you can only disable them
# if they are already installed, which mostly we don't want here.

echo "Selecting only enabled modules for deployment: $DEPLOYMENT"
cat ../pulumi/folio/deployments/$DEPLOYMENT.json | jq '[.[] | select(.action == "enable")]' > release.json
echo "enabling modules: $(cat release.json)"

# Can only do this request if mod-authtoken isn't enabled.
# This takes a good two or three minutes to run on a full install with load
# sample as false and load ref true. When it is working okapi returns a 100 continue
# response.
$CURL $H_JSON --progress-bar \
  -X POST \
  -d@release.json \
  $OKAPI_URL/_/proxy/tenants/$TENANT_ID/install?deploy=false\&preRelease=false\&ignoreErrors=$IGNORE_ERRORS\&tenantParameters=loadSample%3D$SAMPLE_DATA%2CloadReference%3D$REF_DATA
