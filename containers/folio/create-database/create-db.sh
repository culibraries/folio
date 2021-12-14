#!/bin/sh
# Set postgres password environment variable for PG Admin user
export PGPASSWORD=$PG_ADMIN_USER_PASSWORD

# Configure Postgres deployed into a kubernetes cluster.
# TODO Unclear if these two need to run at all. Needs more testing.
psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "CREATE USER $DB_USERNAME WITH PASSWORD '"$DB_PASSWORD"';"
psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "CREATE DATABASE $DB_DATBASE OWNER $DB_USERNAME"
# This definitely needs to run. See comment in ticket.
psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "ALTER role $DB_USERNAME CREATEROLE CREATEDB SUPERUSER;"
