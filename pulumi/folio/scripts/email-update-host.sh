# This script requires that you have set the following in your environment:
# - TOKEN

# You can get a token by going to /settings/developer in the folio UI.

# See get-configs.sh for how to get the entry id for a given deployment.
ENTRY_ID="0cabf10f-57f7-4ab0-9cdb-24fba5a68802"
OKAPI="https://folio-iris-okapi.cublcta.com:9130"
CONFIG=$(cat <<EOF
    {
        "module": "SMTP_SERVER",
        "configName": "smtp",
        "code": "EMAIL_SMTP_HOST",
        "description": "Server smtp host",
        "default": true,
        "enabled": true,
        "value": "email-smtp.us-west-2.amazonaws.com"
    }
EOF
)

curl -X PUT \
$OKAPI/configurations/entries/$ENTRY_ID \
-H 'Content-Type: application/json' \
-H 'X-Okapi-Tenant: cubl' \
-H "X-Okapi-Token: $TOKEN" \
-d "$CONFIG" \
-v
