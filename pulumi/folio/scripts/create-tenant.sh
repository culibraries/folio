#!/usr/bin/env bash

# This is idempotent. Don't worry about running it more than once.
OKAPI_URL="http://localhost:9000"

TENANT_ID="cubl"
TENANT_JSON="{\"id\":\"$TENANT_ID\",\"name\":\"$TENANT_ID\",\"description\":\"Default_tenant\"}"

echo "Creating tenant $TENANT_ID"
curl -sL -w '\n' -D - -X POST -H "Content-type: application/json" -d $TENANT_JSON $OKAPI_URL/_/proxy/tenants
