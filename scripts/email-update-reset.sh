# This will update the reset url for the password reset url in users-bl. This
# is essential to run after every deployment.

# This script requires that you have set the following in your environment:
# - TOKEN

# You can get a token by going to /settings/developer in the folio UI.

# See get-configs.sh for how to get the entry id for a given deployment.
ENTRY_ID="f78111a8-d8a7-4809-a09b-c4f6091ec18c"
OKAPI="https://okapi.colorado.edu:9130"
# This is not OKAPI but the route for stripes. Very important.
RESET_URL="https://folio.colorado.edu"
CONFIG=$(cat <<EOF
    {
        "module": "USERSBL",
        "configName": "resetPassword",
        "code": "FOLIO_HOST",
        "description": "Folio UI application host",
        "default": true,
        "enabled": true,
        "value": "$RESET_URL"
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
