#!/usr/bin/env bash

if [ "$DOCKER_BUILD" = "true" ]; then
    exit 0
fi

echo "this is the postinstall script for auto-ssl-on-express-with-docker"
echo "The following files will be copied to your project directory: letsencrypt_webhook.sh Dockerfile"
echo "If Dockerfile already exists, the new one will be renamed to Dockerfile.new. Please merge it with your old Dockerfile."

cp -v "./bin/letsencrypt_webroot.sh" "../../../"

if [ -f ../../../Dockerfile ]; then
    cp -v "./bin/letsencrypt_Dockerfile" "../../../Dockerfile.new"
    echo "Dockerfile already existed. Merge Dockerfile.new with your existing Dockerfile."
else
    cp -v "./bin/letsencrypt_Dockerfile" "../../../Dockerfile"
fi

echo  "auto-ssl-on-express-with-docker postinstall script: done."