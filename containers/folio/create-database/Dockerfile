FROM alpine:3.13

# Prerequisites
RUN apk add --no-cache curl postgresql-client

# Create working directory
RUN mkdir -p /usr/local/bin/folio

# Set working directory
WORKDIR /usr/local/bin/folio

# Copy in script
COPY create-db.sh /usr/local/bin/folio

# Set postgres password environment variables to give to psql.
# These will be overriden with environmental variables when the container is deployed.
ENV PG_ADMIN_USER='postgres'
ENV PG_ADMIN_USER_PASSWORD='password'
ENV DB_DATABASE='folio'
ENV DB_USERNAME='okapi'
ENV DB_PASSWORD='okapi1234'
ENV DB_HOST='database.host'

# Execute the script on container runtime
CMD ["/usr/local/bin/folio/create-db.sh"]
