#!/bin/sh

# based on
# https://superuser.com/a/1312419/135477
# Use it on your own risk!

# load supplementary function
SCRIPT_DIR=$(dirname "$0")
# shellcheck source=./trace.sh
. "$SCRIPT_DIR"/trace.sh

# main logic of the script goes below
echo "Make firefox & chrome trust system certificates (those in /etc/ssl/certs)"
echo '____________________________________________________________'

trace 'test if script run with super user privileges' \
test "$(id -u)" -eq 0

trace 'update package information' \
apt-get update

trace 'install p11-kit and libnss3' \
apt-get install -y p11-kit libnss3

TRUST=/usr/lib/x86_64-linux-gnu/pkcs11/p11-kit-trust.so

find /usr/lib/ -type f -name "libnssckbi.so" 2>/dev/null | tee | while read -r line; do

    trace "backup $line as $line.bak" \
    mv "$line" "$line.bak"

    trace "replace the library with p11-kit-trust lib" \
    ln -s "$TRUST" "$line"
done

echo 'Restart Firefox and/or Chrom(ium) after the script execution!'
