#!/bin/sh

# load supplementary function
SCRIPT_DIR=$(dirname "$0")
# shellcheck source=./trace.sh
. "$SCRIPT_DIR"/trace.sh

# main logic of the script goes below
echo "Install generated CA certificate into Ubuntu as trusted certificate"
echo '____________________________________________________________'

trace 'change workdir to script dir' \
cd "$SCRIPT_DIR"

trace 'verify localhost certificate against CA certificate just in case' \
openssl verify -CAfile cacert.pem localhost.crt

trace 'test if script run with super user privileges' \
test "$(id -u)" -eq 0

TARGET=/usr/local/share/ca-certificates/grpc_web_localhostCA.crt

trace 'put CA certificate where update-ca-certificates utility will find it' \
cp -a cacert.pem $TARGET

trace 'do update CA certificates' \
update-ca-certificates

# after that one might optionaly start
# integration_test/start-testserver.sh
# and then check if ssl connection valid with
# openssl s_client -connect localhost:9090 -CApath /etc/ssl/certs
