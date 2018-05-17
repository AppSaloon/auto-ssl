#!/usr/bin/env bash

echo "this is the postinstall script for auto-ssl-on-express-with-docker"
echo "3 files will be copied to your project directory: letsencrypt_cronjob, letsencrypt_webhook.sh Dockerfile"
echo "If Dockerfile already exists, the new one will be renamed to Dockerfile.new. Please merge it with your old Dockerfile."

cp -v "./bin/letsencrypt_webroot.sh" "../../"
cp -v "./bin/letsencrypt_cronjob" "../../"

if [ -f ../../Dockerfile ]; then
    cp -v "./bin/letsencrypt_Dockerfile" "../../DockerFile.new"
    echo "Dockerfile already existed. Merge Dockerfile.new with your existing Dockerfile."
else
    cp -v "./bin/letsencrypt_Dockerfile" "../../Dockerfile"
fi

echo  "auto-ssl-on-express-with-docker postinstall script: done."