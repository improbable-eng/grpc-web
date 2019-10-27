#########################################
# supplementary function
# to trace script's commands execution
#########################################

COUNTER=0

# the function echoes it's 1st arg as comment and executes rest args as a command
# it also logs status (ok or failed) of execution
# in case execution failed, script terminates with a failure code
trace() {
  COMMENT="${1:?or_fail}" # fail in case no args are set
  shift

  COUNTER=$(( COUNTER + 1 ))

  echo "═══> $COUNTER: $COMMENT"

  "$@"
  RETVAL=$?

  if [ 0 -eq $RETVAL ]
  then
    echo "═══> $COUNTER: ok"
    echo '____________________________________________________________'
  else
    echo "═══> $COUNTER: failed with $RETVAL"
    echo '____________________________________________________________'
    exit "$RETVAL"
  fi
}
