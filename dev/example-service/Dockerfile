FROM astefanutti/scratch-node:14.14.0

WORKDIR /opt/service/

RUN apk add tar
COPY db-migration/changesets changesets
RUN tar -cvf changesets.tar changesets
    && rm -r changesets

# Download and make executable sh script
# that helps wait the storage is running
ADD https://raw.githubusercontent.com/vishnubob/wait-for-it/54d1f0bfeb6557adf8a3204455389d0901652242/wait-for-it.sh /opt/scripts/
RUN chmod +x /opt/scripts/wait-for-it.sh

# Run the service
ENTRYPOINT ["node", "index.js"]
