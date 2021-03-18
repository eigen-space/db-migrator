# Build stage
# ------------------

FROM node:14.15.4-alpine as STAGE_BUILD

WORKDIR /opt/service/

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

FROM liquibase/liquibase:4.3.0 as FINAL_IMAGE

USER root

# replace shell with bash so we can source files
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# Update the repository sources list
# and install dependencies
RUN apt-get update \
    && apt-get install -y curl \
    && apt-get -y autoclean

# nvm environment variables
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 14.16.0

# Install nvm
# https://github.com/creationix/nvm#install-script
RUN curl --silent -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.2/install.sh | bash

# Install node and npm
RUN source $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

# Add node and npm to path so the commands are available
ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# Confirm installation
RUN node -v
RUN npm -v

WORKDIR /opt/service/

# Copy from the build stage
COPY --from=STAGE_BUILD /opt/service/dist .
# Copy the script of migration runner
COPY ./dev/scripts/migrate.sh /opt/scripts/migrate.sh

RUN mkdir /liquibase/changelog \
    && mkdir /liquibase/upload

ENV PORT 4010

# Run the service
ENTRYPOINT ["node", "index.js"]
