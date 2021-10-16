# DB Migrator

It is a base package that allows to migrate SQL change sets
for a database. It is a simple version of migration like
the Liquibase does but only for NodeJs.

# Why do we have that dev dependencies?

* `@eigenspace/codestyle` - includes lint rules, config for typescript.
* `@eigenspace/commit-linter` - linter for commit messages.
* `@eigenspace/package-publisher` - it publishes the package and set the next version
  automatically.
* `@types/*` - contains type definitions for specific library.
* `clean-webpack-plugin` - it is used to clean dist folder before build.
* `copy-webpack-plugin` - it is used to copy additional files into dist.
* `eslint` - it checks code for readability, maintainability, and functionality errors.
* `eslint-plugin-eigenspace-script` - includes set of script linting rules
  and configuration for them.
* `husky` - used for configure git hooks.
* `lint-staged` - used for configure linters against staged git files.
* `ts-loader` - webpack loader to build typescript files.
* `ts-node` - to run without build typescript.
* `typescript` - is a superset of JavaScript that have static type-checking and ECMAScript features.
* `webpack` - it is used to build the package/library.
* `webpack-cli` - it is used to send commands to webpack using commandline interface.