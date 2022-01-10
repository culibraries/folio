#!/bin/sh

# Set postgres password environment variable for PG Admin user
export PGPASSWORD=$PG_ADMIN_USER_PASSWORD

#psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "CREATE USER $DB_USERNAME WITH PASSWORD '"$DB_PASSWORD"';"
echo "Script version 3"
echo "Attempting to create user $DB_USERNAME"
psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "CREATE USER $DB_USERNAME WITH PASSWORD '"$DB_PASSWORD"';"
# TODO I think this doesn't matter because there is already a postgres database.
# TODO We may need to grant the folio user to be able to access it, although I don't think so.
#echo "Attempting to create database $DB_DATABASE"
#psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "CREATE DATABASE $DB_DATABASE OWNER $DB_USERNAME;"
# This definitely needs to run. See comment in ticket.
# Note removing the SUPERUSER here for reason stated here:
# Why we can't give the role superuser permissions:
# https://serverfault.com/questions/661661/why-cant-i-create-a-superuser-in-aws-postgresql-instance
echo "Attempting alter role for $DB_USERNAME"
psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "ALTER role $DB_USERNAME CREATEROLE CREATEDB;"

# https://dba.stackexchange.com/questions/176155/unable-to-create-schema-on-amazon-rds-for-postgres
# All of the CREATE ROLE statements in module registration are failing. This should fix that.
echo "Granting all permissions to $DB_USERNAME"
psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "GRANT ALL ON DATABASE postgres TO $DB_USERNAME;"
# Grant the folio user the rds_superuser role.
echo "Granting rds_superuser role to $DB_USERNAME"
psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "GRANT rds_superuser TO $DB_USERNAME;"
