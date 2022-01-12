#!/bin/sh

# Set postgres password environment variable for PG Admin user
export PGPASSWORD=$PG_ADMIN_USER_PASSWORD
echo "Attempting to create user $DB_USERNAME"
psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "CREATE USER $DB_USERNAME WITH PASSWORD '"$DB_PASSWORD"';"
# NOTE: There's no need to create the postgres database since we do this through RDS.
# Note we can't give the folio the SUPERUSER role for reason stated here:
# https://serverfault.com/questions/661661/why-cant-i-create-a-superuser-in-aws-postgresql-instance
# These other perms are key.
echo "Attempting alter role for $DB_USERNAME"
psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "ALTER role $DB_USERNAME CREATEROLE CREATEDB;"
# https://dba.stackexchange.com/questions/176155/unable-to-create-schema-on-amazon-rds-for-postgres
# All of the CREATE ROLE statements in module registration are failing. This should fix that.
echo "Granting all permissions to $DB_USERNAME"
psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "GRANT ALL ON DATABASE postgres TO $DB_USERNAME;"
# Finally we erant the folio user the rds_superuser role. This is how superuser stuff
# is handled in RDS.
echo "Granting rds_superuser role to $DB_USERNAME"
psql -U $PG_ADMIN_USER -h $DB_HOST -w --command "GRANT rds_superuser TO $DB_USERNAME;"
