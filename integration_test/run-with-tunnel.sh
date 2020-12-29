#!/usr/bin/env bash
set -e
set -x

cd "$(dirname "$0")"

mkdir -p sauce-connect-proxy
pushd sauce-connect-proxy

wait_file() {
  local file="$1"; shift
  local wait_seconds="${1:-10}"; shift
  until test $((wait_seconds--)) -eq 0 -o -e "$file" ; do sleep 1; done
  ((++wait_seconds))
}

BASE_SAUCELABS_TUNNEL_ID=$(openssl rand -base64 12)
export SAUCELABS_TUNNEL_ID_NO_SSL_BUMP="$BASE_SAUCELABS_TUNNEL_ID-no-ssl-bump"
export SAUCELABS_TUNNEL_ID_WITH_SSL_BUMP="$BASE_SAUCELABS_TUNNEL_ID-with-ssl-bump"

SAUCELABS_READY_FILE_NO_SSL_BUMP=./sauce-connect-readyfile-no-ssl-bump
SAUCELABS_READY_FILE_WITH_SSL_BUMP=./sauce-connect-readyfile-with-ssl-bump
# Clear the ready files in case they already exist
rm -f $SAUCELABS_READY_FILE_WITH_SSL_BUMP $SAUCELABS_READY_FILE_NO_SSL_BUMP

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  SAUCELABS_TUNNEL_PATH=./sc-4.6.3-linux/bin/sc
  if [[ ! -f "$SAUCELABS_TUNNEL_PATH" ]]; then
    wget https://saucelabs.com/downloads/sc-4.6.3-linux.tar.gz
    tar -xzvf ./sc-4.6.3-linux.tar.gz
  fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
  SAUCELABS_TUNNEL_PATH=./sc-4.6.3-osx/bin/sc
  if [[ ! -f "$SAUCELABS_TUNNEL_PATH" ]]; then
    wget https://saucelabs.com/downloads/sc-4.6.3-osx.zip
    unzip ./sc-4.6.3-osx.zip
  fi
else
  echo "Unsupported platform"
fi

if [[ -z "${SC_SSL_BUMPING}" ]]; then
  $SAUCELABS_TUNNEL_PATH \
    -u $SAUCELABS_USERNAME \
    -k $SAUCELABS_ACCESS_KEY \
    --logfile ./saucelabs-no-ssl-bump-logs \
    --pidfile ./saucelabs-no-ssl-bump-pid \
    --no-ssl-bump-domains testhost,corshost \
    --tunnel-identifier $SAUCELABS_TUNNEL_ID_NO_SSL_BUMP \
    --readyfile $SAUCELABS_READY_FILE_NO_SSL_BUMP \
    -x https://saucelabs.com/rest/v1 &
  SAUCELABS_PROCESS_ID_NO_SSL_BUMP=$!
  echo "SAUCELABS_PROCESS_ID_NO_SSL_BUMP:"
  echo $SAUCELABS_PROCESS_ID_NO_SSL_BUMP
fi

if [[ ! -z "${SC_SSL_BUMPING}" ]]; then
  $SAUCELABS_TUNNEL_PATH \
    -u $SAUCELABS_USERNAME \
    -k $SAUCELABS_ACCESS_KEY \
    --logfile ./saucelabs-with-ssl-bump-logs \
    --pidfile ./saucelabs-with-ssl-bump-pid \
    --tunnel-identifier $SAUCELABS_TUNNEL_ID_WITH_SSL_BUMP \
    --readyfile $SAUCELABS_READY_FILE_WITH_SSL_BUMP \
    -x https://saucelabs.com/rest/v1 &
  SAUCELABS_PROCESS_ID_WITH_SSL_BUMP=$!
  echo "SAUCELABS_PROCESS_ID_WITH_SSL_BUMP:"
  echo $SAUCELABS_PROCESS_ID_WITH_SSL_BUMP
fi

function killTunnels {
  echo "Killing Sauce Labs Tunnels..."
  if [[ -z "${SC_SSL_BUMPING}" ]]; then
    kill $SAUCELABS_PROCESS_ID_NO_SSL_BUMP
  fi
  if [[ ! -z "${SC_SSL_BUMPING}" ]]; then
    kill $SAUCELABS_PROCESS_ID_WITH_SSL_BUMP
  fi
}

trap killTunnels SIGINT
trap killTunnels EXIT

# Wait for tunnels to indicate ready status
if [[ -z "${SC_SSL_BUMPING}" ]]; then
  wait_file "$SAUCELABS_READY_FILE_NO_SSL_BUMP" 60 || {
    echo "Timed out waiting for sauce labs tunnel (with ssl bump)"
    kill $SAUCELABS_PROCESS_ID_NO_SSL_BUMP
    exit 1
  }
  echo "SAUCELABS_TUNNEL_ID_NO_SSL_BUMP: $SAUCELABS_TUNNEL_ID_NO_SSL_BUMP"
fi

if [[ ! -z "${SC_SSL_BUMPING}" ]]; then
  wait_file "$SAUCELABS_READY_FILE_WITH_SSL_BUMP" 60 || {
    echo "Timed out waiting for sauce labs tunnel (no ssl bump)"
    kill $SAUCELABS_PROCESS_ID_WITH_SSL_BUMP
    exit 1
  }
  echo "SAUCELABS_TUNNEL_ID_WITH_SSL_BUMP: $SAUCELABS_TUNNEL_ID_WITH_SSL_BUMP"
fi

popd

# Run the specified commands
$@

# Output the logs from the Sauce Connect proxy
cd "$(dirname "$0")"
pushd sauce-connect-proxy
echo "Printing SauceConnect no-ssl bump logs:"
cat ./saucelabs-no-ssl-bump-logs || true
echo "Printing SauceConnect with-ssl bump logs:"
cat ./saucelabs-with-ssl-bump-logs || true
popd
