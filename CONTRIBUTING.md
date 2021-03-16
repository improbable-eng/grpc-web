## Developer Tool Prerequisites
* [go](https://golang.org/doc/install) - The Go programming language
* [nvm](https://github.com/creationix/nvm#installation) - Node Version Manager (for installing NodeJS and NPM)

## Performing a Fresh Checkout
The following steps guide you through a fresh checkout

```
# Create a workspace
cd ~/Projects/  # or wherever you want your checkout to live

# Checkout project sources
git clone git@github.com:improbable-eng/grpc-web.git
cd grpc-web

# Install NodeJS dependencies
nvm use
npm install
```

Note you will also need to [install buf](https://github.com/bufbuild/buf) and add it to your `PATH` environment variable if you wish to re-generate the integration test proto files.

## Testing Prerequisites
Before you run the tests for the first time, please follow these steps:

### Installing the Local Certificate
In order to run the Karma (Integration) tests, you will need to add the certificate found in `misc/localhostCA.pem` to your system's list of trusted certificates. This will vary from operating system to operating system.

### macOS
1. Open Keychain Access
2. Select 'System' from the list of Keychains
3. From the `File` menu, select `Import Items`
4. Select `misc/localhost.crt`
5. Double click on the new `GRPC Web example dev server` certificate
6. Expand the `Trust' section
7. Change the `When using this certificate` option to `Always Trust`
8. Close the certificate details pop-up.

Repeat the above process for `misc/localhostCA.pem`.

### Setting the required hostnames
Add the following entries to your system's `hosts` file:

```
# grpc-web
127.0.0.1       testhost
127.0.0.1       corshost
```

## Running the Tests
These steps assume you have performed all the necessary testing prerequisites. Also note that running all the tests will require you to open a web-browser on your machine.

To start the test suite, run:

```
cd src/github.com/improbable-eng/grpc-web
npm test
```

At some point during the test run, execution will pause and the following line will be printed:

```
INFO [karma]: Karma v3.0.0 server started at https://0.0.0.0:9876/
```

This is your prompt to open a web browser on https://localhost:9876 at which point the tests will continue to run.

## Creating a Release
1. From a fresh checkout of master, create a release branch, ie: `feature/prepare-x.y.z-release`
2. Update `CHANGELOG.md` by comparing commits to master since the last Github Release
3. Raise a pull request for your changes, have it reviewed and landed into master.
4. Switch your local checkout back to the master branch, pull your merged changes and run `./publish-release.sh`.
5. Create the ARM binaries and attach them to the Github release.
