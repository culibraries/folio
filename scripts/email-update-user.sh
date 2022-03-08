# This script requires that you have set the following in your environment:
# - TOKEN
# - SMTP_USERNAME

# You can get a token by going to /settings/developer in the folio UI.

# See get-configs.sh for how to get the entry id for a given deployment.
ENTRY_ID="0fc409b8-fb03-4e9e-b348-ec741da8b3f4"
OKAPI="https://folio-iris-okapi.cublcta.com:9130"
CONFIG=$(cat <<EOF
    {
        "module": "SMTP_SERVER",
        "configName": "smtp",
        "code": "EMAIL_USERNAME",
        "description": "SMTP Username",
        "default": true,
        "enabled": true,
        "value": "$SMTP_USERNAME"
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
