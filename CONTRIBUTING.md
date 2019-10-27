## Developer Tool Prerequisites
* [go](https://golang.org/doc/install) - The Go programming language
* [dep](https://golang.github.io/dep/docs/installation.html) - Go dependency manager
* [nvm](https://github.com/creationix/nvm#installation) - Node Version Manager (for installing NodeJS and NPM)

## Performing a Fresh Checkout
The following steps guide you through a fresh checkout

```shell script
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

Note you will also need to [install prototool](https://github.com/uber/prototool/blob/dev/docs/install.md) and add it to your `PATH` environment variable if you wish to re-generate the integration test proto files. Or just:

```shell script
export PROTOTOOL_VER=1.8.0
./install-prototool.sh
```

## Testing Prerequisites 
Before you run the tests for the first time, please follow these steps:

### Setup TLS
For the impatient in Ubuntu: just run 
```shell script
(
cd keypairs && \
./gen_keypairs.sh && \
sudo ./ubuntu_trust_ca_cert.sh && \
sudo ./ubuntu_setup_browsers.sh
)
```
Don't forget to restart Firefox and/or Chrom(ium) after successful execution!

Others please see below:

#### Generate the Local Certificate
Karma (Integration) tests require TLS. In order to run tests, you will need to generate two keypairs. Keypair is both a Private Key and Certificate (public key). Just run `./keypairs/gen_keypairs.sh`. It is a Posix script depending only on OpenSSL. The script should work in every *nix with OpenSSL installed and might work even in CygWIN (if it really does, please confirm this).

#### Install Self-Signed Certificate(s)
You will need to add generated certificate(s) to your system's list of trusted certificates. This will vary from operating system to operating system.

##### macOS
One has to install both generated certificates:

1. Open Keychain Access
2. Select 'System' from the list of Keychains
3. From the `File` menu, select `Import Items`
4. Select `keypairs/localhost.crt`
5. Double click on the new `GRPC Web example dev server` certificate
6. Expand the `Trust' section
7. Change the `When using this certificate` option to `Always Trust` 
8. Close the certificate details pop-up.

Repeat the above process for `keypairs/cacert.pem`.

##### Ubuntu
One has to add only CA certificate to the system's list of trusted certificates. `keypairs/ubuntu_trust_ca_cert.sh` is doing just that. To also make a browser trust the certificate use `keypairs/ubuntu_setup_browsers.sh`. Both scripts need to be run with superuser privileges.   

##### Other *nixes
The process should be more or less the same as in Ubuntu. Look for the system package `ca-certificates`. There should be some `update-ca-certificates` or `update-ca-trust` utility nearby. Use it to add generated CA certificate to the system's list of trusted certificates. 

Your might test if you succeeded at this step if you start `integration_test/start-testserver.sh`, then do 
```shell script
SYS_SSL_CERT_DIR='/etc/ssl/certs'
echo "Q" | openssl s_client -connect localhost:9090 -CApath "$SYS_SSL_CERT_DIR" | grep -F 'verify return'
```
and check if output contains any error. 

Next step, i.e. make your browsers trust system certificates [might be not even needed](https://superuser.com/a/1155710/135477) depending on your *nix distro. 

### Setting the required hostnames
Add the following entries to your system's `hosts` file:

```
# grpc-web
127.0.0.1       testhost
127.0.0.1       corshost
```

### Setup Environment
do
```shell script
unset BROWSER
export PATH=$PATH:${GOPATH:-$HOME/go}/bin:$(pwd)
```

## Running the Tests
These steps assume you have performed all the necessary testing prerequisites. Also note that running all the tests will require you to open a web-browser on your machine.

To start the test suite, run:

```shell script
cd src/github.com/improbable-eng/grpc-web
npm test
npm test:integration
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