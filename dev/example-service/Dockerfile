# Build stage
# ------------------

FROM node:14.15.4-alpine as STAGE_BUILD

WORKDIR /opt/service/

# Install tar to be able to create an archive
# that contains db change sets
RUN apk add tar

# Create an archive with db changes
COPY db-migration/changesets changesets
RUN cd changesets \
    && tar -cvf changelog.tar . \
    && cd ..

# Install dependencies we need to build the app

COPY .yarnrc .
COPY package.json .
COPY yarn.lock .

RUN yarn

# Build the service
# As a result we get the ready-to-run nodejs file: /opt/service/dist/index.js

COPY tsconfig.json .
COPY ./src ./src

RUN yarn build

# Final image
# ------------------

FROM astefanutti/scratch-node:14.14.0 as FINAL_IMAGE

WORKDIR /opt/service/

# Copy from the build stage
COPY --from=STAGE_BUILD /opt/service/changesets/changelog.tar ./changelog.tar
COPY --from=STAGE_BUILD /opt/service/dist .

ENV SERVICE_NAME 'example-service'
ENV CHANGELOG_ARCHIVE_PATH '/opt/service/changelog.tar'

# Run the service
ENTRYPOINT ["node", "index.js"]
