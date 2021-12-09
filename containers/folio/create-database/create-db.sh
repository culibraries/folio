#!/bin/sh
# Set postgres password environment variable for PG Admin user
export PGPASSWORD=$PG_ADMIN_USER_PASSWORD

# Configure Postgres deployed into a kubernetes cluster.
psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "CREATE USER $DB_USERNAME WITH PASSWORD '"$DB_PASSWORD"';"
psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "CREATE DATABASE $DB_DATBASE OWNER $DB_USERNAME"
psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "ALTER role $DB_USERNAME CREATEROLE CREATEDB SUPERUSER;"
