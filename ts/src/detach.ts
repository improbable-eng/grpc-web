// awaitingExecution is null if there is no current timer
let awaitingExecution: Array<() => void> | null = null;

function runCallbacks() {
  if (awaitingExecution) {
    // Use a new reference to the awaitingExecution array to allow callbacks to add to the "new" awaitingExecution array
    const thisCallbackSet = awaitingExecution;
    awaitingExecution = null;
    for (let i = 0; i < thisCallbackSet.length; i++) {
      try {
        thisCallbackSet[i]();
      } catch (e) {
        if (awaitingExecution === null) {
          awaitingExecution = [];
          setTimeout(() => {
            runCallbacks();
          }, 0);
        }
        // Add the remaining callbacks to the array so that they can be invoked on the next pass
        for (let k = thisCallbackSet.length - 1; k > i; k--) {
          awaitingExecution.unshift(thisCallbackSet[k]);
        }
        // rethrow the error
        throw e;
      }
    }
  }
}

// detach executes the callbacks in the order they are added with no context - this is used to avoid errors thrown
// in user callbacks being caught by handlers such as fetch's catch. This function is necessary as setTimeout in
// Safari is prone to switching the order of execution of setTimeout(0).
export default function detach(cb: () => void) {
  if (awaitingExecution !== null) {
    // there is a timer running, add to the list and this function will be executed with that existing timer
    awaitingExecution.push(cb);
    return;
  }
  awaitingExecution = [cb];
  setTimeout(() => {
    runCallbacks();
  }, 0);
}
