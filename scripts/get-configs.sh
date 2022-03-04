# This script requires that you have set the following in your environment:
# - TOKEN

# You can get a token by going to /settings/developer in the folio UI.

OKAPI="https://folio-iris-okapi.cublcta.com:9130"

# Read the above JSON into a here-doc, using jq to read each json object.
# Then post each to the config endpoint.
curl \
$OKAPI/configurations/entries \
-H 'Content-Type: application/json' \
-H 'X-Okapi-Tenant: cubl' \
-H "X-Okapi-Token: $TOKEN" \
-v
