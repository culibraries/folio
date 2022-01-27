#!/usr/bin/env bash

OKAPIURL="http://localhost:9000"
CURL="curl -w\n -D - "

H_TENANT="-HX-Okapi-Tenant:cubl"
H_JSON="-HContent-type:application/json"

echo $OKAPIURL

echo "Creating enable json ..."
cat >enable.json << END
[ {
    "id" : "folio_tenant-settings-6.1.2",
    "action" : "enable"
  }, {
    "id" : "mod-login-saml-2.3.2",
    "action" : "enable"
  }, {
    "id" : "folio_stripes-core-7.2.0",
    "action" : "enable"
  }, {
    "id" : "folio_users-6.1.4",
    "action" : "enable"
  }, {
    "id" : "mod-users-bl-7.0.1",
    "action" : "enable"
  }, {
    "id" : "mod-authtoken-2.8.2",
    "action" : "enable"
  } ]
END

echo "Curling install. See logs/enable-response.json"

$CURL $H_TENANT $H_JSON --progress-bar \
  -X POST \
  -d@enable.json \
  $OKAPIURL/_/proxy/tenants/cubl/install > logs/enable-response.json
