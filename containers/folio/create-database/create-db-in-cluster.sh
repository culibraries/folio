#!/bin/sh

# This has been known to work for creating the in-cluster-pg. It produces errors
# when run against Aurora.

# Set postgres password environment variable for PG Admin user
export PGPASSWORD=$PG_ADMIN_USER_PASSWORD

# Configure Postgres deployed into a kubernetes cluster.
echo "Attempting to create user $DB_USERNAME"
psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "CREATE USER $DB_USERNAME WITH PASSWORD '"$DB_PASSWORD"';"
echo "Attempting to create database $DB_DATABASE"
psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "CREATE DATABASE $DB_DATABASE OWNER $DB_USERNAME;"
# This definitely needs to run. See comment in ticket.
echo "Attempting alter role for $DB_USERNAME"
psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "ALTER role $DB_USERNAME CREATEROLE CREATEDB SUPERUSER;"
