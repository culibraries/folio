# Configures FOLIO email sending to use AWS SES (simple email service) as the SMTP
# host. This requires that SES be set up through the console (it has likely already
# been done so check that first).

# Note this is not idempotent. Once the config entries are there, they have to
# be updated with the config entry id. See update-config.sh for help with that.
# See https://github.com/folio-org/mod-configuration/blob/master/ramls/configuration/config.raml

# This script requires that you have set the following in your environment:
# - SMTP_PASSWORD
# - SMTP_USERNAME
# - TOKEN

# You can get a token by going to /settings/developer in the folio UI.
# Ask a colleague how to get the SMTP username and password.

OKAPI="https://folio-kiwi-okapi.cublcta.com:9130"
CONFIGS=$(cat <<EOF
[
    {
        "module": "SMTP_SERVER",
        "configName": "smtp",
        "code": "EMAIL_SMTP_HOST",
        "description": "Server smtp host",
        "default": true,
        "enabled": true,
        "value": "email-smtp.us-west-2.amazonaws.com"
    },
    {
        "module": "SMTP_SERVER",
        "configName": "smtp",
        "code": "EMAIL_USERNAME",
        "description": "SMTP Username",
        "default": true,
        "enabled": true,
        "value": ""
    },
    {
        "module": "SMTP_SERVER",
        "configName": "smtp",
        "code": "EMAIL_PASSWORD",
        "description": "SMTP Password",
        "default": true,
        "enabled": true,
        "value": "$SMTP_PASSWORD"
    },
    {
        "module": "SMTP_SERVER",
        "configName": "smtp",
        "code": "EMAIL_SMTP_PORT",
        "description": "Server smtp port",
        "default": true,
        "enabled": true,
        "value": "587"
    },
    {
        "module": "SMTP_SERVER",
        "configName": "smtp",
        "code": "EMAIL_FROM",
        "description": "SMTP From Email Address",
        "default": true,
        "enabled": true,
        "value": "libnotify@colorado.edu"
    },
    {
        "module": "SMTP_SERVER",
        "configName": "smtp",
        "code": "EMAIL_SMTP_SSL",
        "description": "SMTP SSL configuration",
        "default": true,
        "enabled": true,
        "value": "STARTTLS"
    },
    {
        "module": "USERSBL",
        "configName": "resetPassword",
        "code": "FOLIO_HOST",
        "description": "Folio UI application host",
        "default": true,
        "enabled": true,
        "value": "$OKAPI"
    }
]
EOF
)

# Read the above JSON into a here-doc, using jq to read each json object.
# Then post each to the config endpoint.
jq -c '.[]'  <<< "$CONFIGS" | while read i; do
    echo Posting $i to $OKAPI
    curl -X POST \
    $OKAPI/configurations/entries \
    -H 'Content-Type: application/json' \
    -H 'X-Okapi-Tenant: cubl' \
    -H "X-Okapi-Token: $TOKEN" \
    -d "$i" \
    -v
done
