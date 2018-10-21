## Developer Tool Prerequisites
* [go](https://golang.org/doc/install) - The Go programming language
* [dep](https://golang.github.io/dep/docs/installation.html) - Go dependency manager
* [nvm](https://github.com/creationix/nvm#installation) - Node Version Manager (for installing NodeJS and NPM)

## Performing a Fresh Checkout
The following steps guide you through a fresh checkout

```
# Create a workspace
cd ~/Projects/grpc-web  # or wherever you want your checkout to live
export GOPATH=$(pwd)

# Checkout project sources into your new go workspace
go get -u github.com/improbable-eng/grpc-web/go
cd $GOPATH/src/github.com/improbable-eng/grpc-web

# Install go dependencies
dep ensure

# Install NodeJS dependencies
nvm use
npm install
```

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