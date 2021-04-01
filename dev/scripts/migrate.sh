#!/usr/bin/env bash

# Parameters from a service
serviceName=$1
dbName=$2

# Paths
uploadDirectory=/liquibase/upload/$serviceName
changeLogDirectory=/liquibase/changelog/$serviceName
changelogArchiveFilename=changelog.tar

# Pipeline

echo "migrate service: $serviceName, database: $dbName"

echo "clear the changelog directory"
rm -rf "${changeLogDirectory:?}" || exit 1
mkdir -p "${changeLogDirectory}" || exit 2

echo "extract an uploaded archive with the changelog"
cp "$uploadDirectory/$changelogArchiveFilename" "$changeLogDirectory/$changelogArchiveFilename" || exit 3
cd "$changeLogDirectory" || exit 4
tar -xvf $changelogArchiveFilename || exit 5

echo "start migration"
# `yes S` here is to skip the question about Liquibase Hub
# that liquibase asks before migration
yes S | liquibase --defaultsFile=/liquibase/liquibase.docker.properties \
  --driver=org.postgresql.Driver \
  --url="jdbc:postgresql://$DB_HOST:$DB_PORT/$dbName" \
  --changeLogFile=/$CHANGELOG_FILENAME \
  --username=$DB_USERNAME \
  --password=$DB_PASSWORD \
  update \
  || exit 6

echo "migration is completed successfully"