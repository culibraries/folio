#!/usr/bin/env bash

OKAPIURL="http://localhost:9000"
CURL="curl -w\n -D - "

H_TENANT="-HX-Okapi-Tenant:cubl"
H_JSON="-HContent-type:application/json"
H_TOKEN="-HX-Okapi-Token:$TOKEN" # Don't paste here bc you will forget you did!

echo $OKAPIURL

# NOTE Boostrap superuser borks then these modules will be disabled.
# You can re-enable them like this.
# [ {
#     "id" : "folio_tenant-settings-6.1.2",
#     "action" : "enable"
#   }, {
#     "id" : "mod-login-saml-2.3.2",
#     "action" : "enable"
#   }, {
#     "id" : "folio_stripes-core-7.2.0",
#     "action" : "enable"
#   }, {
#     "id" : "folio_users-6.1.4",
#     "action" : "enable"
#   }, {
#     "id" : "mod-users-bl-7.0.1",
#     "action" : "enable"
#   }, {
#     "id" : "mod-authtoken-2.8.2",
#     "action" : "enable"
# } ]
# [ {
#     "id" : "mod-authtoken-2.8.2",
#     "action" : "disable"
# } ]

echo "Creating enable json ..."
cat > enable.json << END
[ {
    "id" : "mod-data-export-4.1.2",
    "action" : "enable"
   },
   {
    "id" : "folio_inventory-7.1.4",
    "action" : "enable"
  }, {
    "id" : "mod-data-export-worker-1.1.8",
    "action" : "enable"
} ]
END

echo "Curling install"

# Can only do this request if mod-authtoken isn't enabled.
$CURL $H_TENANT $H_JSON $H_TOKEN --progress-bar \
  -X POST \
  -d@enable.json \
  $OKAPIURL/_/proxy/tenants/cubl/install

# $CURL $H_TENANT $H_JSON $H_TOKEN --progress-bar \
#   -X POST \
#   -d@enable.json \
#   $OKAPIURL/_/proxy/tenants/cubl/install
