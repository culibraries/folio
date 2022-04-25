#!/bin/bash

if [ $# -eq 0 ] ; then
    echo "No arguments supplied."
    exit 1
fi

# Check that the github personal access token is set in the env.
if [ -z "$GITHUB_PAT" ]; then
    echo "Need to set GITHUB_PAT in your env"
    exit 1
fi

# Check that we can access pulumi.
if [ -z "$PULUMI_CONFIG_PASSPHRASE" ]; then
    echo "Need to set PULUMI_CONFIG_PASSPHRASE in your env"
    exit 1
fi

# Grab the arguments we need.
RELEASE=$1
STRIPES_TAG=$2 # Increment the suffix of this (the part after he last dot) manually when you need to push new builds.
FLOWER=`echo "$3" | awk '{ print tolower($1) }'` # Make sure it is lowercase.
echo "Creating stripes build for release $RELEASE $STRIPES_TAG $FLOWER"

# Delete the temp dir if it exists so there is no error.
if [ -d "temp" ]; then rm -Rf temp; fi
echo "Copying local files..."
mkdir temp
cp -r tenant-assets temp/tenant-assets
cp Dockerfile temp/Dockerfile
cd temp
echo "Current working directory: $PWD"

echo "Downloading remote files for release..."
curl -Os https://raw.githubusercontent.com/folio-org/platform-complete/$RELEASE/docker/entrypoint.sh
curl -Os https://raw.githubusercontent.com/folio-org/platform-complete/$RELEASE/docker/nginx.conf
curl -Os https://raw.githubusercontent.com/folio-org/platform-complete/$RELEASE/package.json
curl -Os https://raw.githubusercontent.com/folio-org/platform-complete/$RELEASE/stripes.config.js

echo "Replacing the tenant assets..."
# This perl command is more cross-platform than sed.
perl -i -pe "s/opentown-libraries-logo.png/cu-boulder-logo-text-black.svg/" stripes.config.js
perl -i -pe "s/opentown-libraries-favicon.png/favicon-32x32.png/" stripes.config.js
perl -i -pe "s/Opentown Libraries/University of Colorado Boulder Libraries/" stripes.config.js

# We bulid two container images, both of which are deployed in the cluster in order to
# handle both production and test FOLIO hosts.
echo "Building stripes containers..."
echo "This is going to take approximately 10 mins for each container (there are two)"
docker build -t ghcr.io/culibraries/folio_stripes:dev.$STRIPES_TAG --build-arg OKAPI_URL=https://folio-$FLOWER-okapi.cublcta.com:9130 .
docker build -t ghcr.io/culibraries/folio_stripes:$STRIPES_TAG --build-arg OKAPI_URL=https://okapi.colorado.edu:9130 .

# GITHUB_PAT needs to be set in the local ENV for this next step to work.
echo "Pushing docker builds to github container registry"
echo $GITHUB_PAT | docker login ghcr.io -u USERNAME --password-stdin
docker push ghcr.io/culibraries/folio_stripes:dev.$STRIPES_TAG
docker push ghcr.io/culibraries/folio_stripes:$STRIPES_TAG

echo "Changing to the the pulumi project directory..."
cd ../../../pulumi/folio # Have to be in this directory to invoke pulumi command.
echo "Switched to: $PWD"
echo "Setting pulumi config value for stripes container tag $STRIPES_TAG..."
pulumi config set stripes-container-tag $STRIPES_TAG
# Do same for the releaase since that will likely be changing as well.
echo "Setting pulumi config value for the release $RELEASE..."
pulumi config set release $RELEASE
cd ../../containers/folio/stripes # Go back to where this script lives.
echo "Back in script directory: $PWD"
