#!/usr/bin/env bash
set -e
set -x

if [ "$GLOBAL_TESTSERVER" = true ] ; then
  echo "Not starting testserver as GLOBAL_TESTSERVER is set"
else
  function killGoTestServer {
    echo "Killing Go Test server..."
    kill ${SERVER_PID} &> /dev/null
  }

  echo "Starting Go Test server..."
  ./start-testserver.sh &
  SERVER_PID=$!

  # Check the Go Test server started up ok.
  sleep 0.5
  ps ${SERVER_PID} &> /dev/null

  # Kill the Go Test server when this script exists or is interrupted.
  trap killGoTestServer SIGINT
  trap killGoTestServer EXIT
fi

$@
