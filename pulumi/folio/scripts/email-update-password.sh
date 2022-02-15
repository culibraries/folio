# This script requires that you have set the following in your environment:
# - TOKEN
# - SMTP_PASSWORD

# You can get a token by going to /settings/developer in the folio UI.

# See get-configs.sh for how to get the entry id for a given deployment.
ENTRY_ID="7a572299-e0db-4aca-98d3-8a6e6709a9cb"
OKAPI="https://folio-iris-okapi.cublcta.com:9130"
CONFIG=$(cat <<EOF
    {
        "module": "SMTP_SERVER",
        "configName": "smtp",
        "code": "EMAIL_PASSWORD",
        "description": "SMTP Password",
        "default": true,
        "enabled": true,
        "value": "$SMTP_PASSWORD"
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
