#!/usr/bin/env bash

# Environment variables
DB_HOST=192.168.0.102
DB_PORT=5432
# TODO: It should be parameter we get from a migration request
DB_NAME=postgres
DB_USERNAME=postgres
DB_PASSWORD=postgres
CHANGELOG_FILENAME=master.xml

# Paths
uploadDirectory=/liquibase/upload
changeLogDirectory=/liquibase/changelog
changelogArchiveFilename=changelog.tar

# Pipeline

echo "clear the changelog directory"
rm -rf "${changeLogDirectory:?}/*" || exit 1

echo "extract an uploaded archive with the changelog"
cp "$uploadDirectory/$changelogArchiveFilename" "$changeLogDirectory/$changelogArchiveFilename" || exit 3
cd $changeLogDirectory || exit 4
tar -xvf $changelogArchiveFilename || exit 5

echo "start migration"
# `yes S` here is to skip the question about Liquibase Hub
# that liquibase asks before migration
yes S | liquibase --defaultsFile=/liquibase/liquibase.docker.properties \
  --driver=org.postgresql.Driver \
  --url="jdbc:postgresql://$DB_HOST:$DB_PORT/$DB_NAME" \
  --changeLogFile=/$CHANGELOG_FILENAME \
  --username=$DB_USERNAME \
  --password=$DB_PASSWORD \
  update \
  || exit 6

echo "migration is completed successfully"