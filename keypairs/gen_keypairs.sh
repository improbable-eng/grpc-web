#!/bin/sh
# Regenerate the self-signed certificate for local host. Recent versions of firefox and chrome(ium)
# require a certificate authority to be imported by the browser (localhostCA.pem) while
# the server uses a cert and key signed by that certificate authority.
# Based primarily on
# https://www.phildev.net/ssl/creating_ca.html

# load supplementary function
SCRIPT_DIR=$(dirname "$0")
# shellcheck source=./trace.sh
. "$SCRIPT_DIR"/trace.sh

# main logic of the script goes below
echo "Generate Certificate Authority's (CA's) key and certificate first, then local key and certificate in a chain"
echo '____________________________________________________________'

trace 'change workdir to script dir' \
cd "$SCRIPT_DIR"

trace 'maybe remove old keys' \
rm -rf CA ./*.pem ./*.key

trace 'create auxiliary directory' \
mkdir CA

trace 'cd there' \
cd CA

trace 'touch index.txt' \
touch index.txt

CA_PASSWORD=notsafe

trace "create a Private Key and a Certificate Signing Request (CSR) for CA" \
openssl req -new -newkey rsa:2048 -keyout ../cakey.pem -out careq.pem -config ../localhostCA.conf -passout pass:$CA_PASSWORD

trace 'self-sign the CSR to make your CA certificate' \
openssl ca -batch -create_serial -out ../cacert.pem -days 1825 -keyfile ../cakey.pem -selfsign \
-extensions v3_ca -config ../localhostCA.conf -passin pass:$CA_PASSWORD -infiles careq.pem

trace 'generate a new localhost Private Key' \
openssl genrsa -out ../localhost.key 2048

trace 'generate a localhost CSR based on that' \
openssl req -new -key ../localhost.key -out localhost.csr -config ../localhost.conf

trace 'sign the CSR' \
openssl ca -batch  -out ../localhost.crt -config ../localhostCA.conf -passin pass:$CA_PASSWORD -infiles localhost.csr

trace 'verify localhost certificate against CA certificate' \
openssl verify -CAfile ../cacert.pem ../localhost.crt
