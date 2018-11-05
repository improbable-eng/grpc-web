#!/usr/bin/env bash
set -e
set -x

if [ "$GLOBAL_TESTSERVER" = true ] ; then
  echo "Not starting testserver as GLOBAL_TESTSERVER is set"
else
  function killGoTestServer {
    echo "Killing testserver..."
    killall testserver
  }

  ./start-testserver.sh

  # Kill the Go Test server when this script exits or is interrupted.
  trap killGoTestServer SIGINT
  trap killGoTestServer EXIT
fi

$@
