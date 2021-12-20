#!/usr/bin/env bash

# Use this to test out the superuser after it has been created. If all goes well
# you should get back a token. NOTE this requires that you have port-forwared
# okapi on the remote cluster to your localhost on port 9000.
# You also must export the the two environment variables SU_NAME and SU_PASSWORD
# into your local env. Those are values are avalable to you if you do
# pulumi config --show secrets.

OKAPIURL="http://localhost:9000"
CURL="curl -w\n -D - "

H_TENANT="-HX-Okapi-Tenant:cubl"
H_JSON="-HContent-type:application/json"

echo $OKAPIURL

echo "Do login and obtain our token ..."
cat >admin-credentials.json << END
{
  "username": "$SU_NAME",
  "password": "$SU_PASSWORD"
}
END

$CURL $H_TENANT $H_JSON --progress-bar \
  -X POST \
  -d@admin-credentials.json \
  $OKAPIURL/authn/login > admin-login-response.json

echo "Extract the token header from the response ..."
H_TOKEN=-H$(grep -i x-okapi-token "admin-login-response.json" | sed 's/ //')
echo
echo Received a token: $H_TOKEN

# Comment out if you want to inspect the response. But don't commit!
rm admin-login-response.json
