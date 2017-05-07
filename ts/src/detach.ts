// toExecute is null if there is no current timer
let toExecute: Array<() => void> | null = null;

function runCallbacks() {
  if (toExecute) {
    // Use a new reference to the toExecute array to allow callbacks to add to the "new" toExecute array
    const thisRound = toExecute;
    toExecute = null;
    for(let i = 0; i < thisRound.length; i++) {
      try {
        thisRound[i]();
      } catch (e) {
        if (toExecute===null) {
          toExecute = [];
          setTimeout(() => {
            runCallbacks();
          },0);
        }
        // Add the remaining callbacks to the array so that they can be invoked on the next pass
        for(let k = thisRound.length-1; k > i; k--) {
          toExecute.unshift(thisRound[k]);
        }
        // rethrow the error
        throw e;
      }
    }
  }
}

// detach executes the callbacks in the order they are added with no context - this is used to avoid errors thrown
// in user callbacks being caught by handlers such as fetch's catch.
export default function detach(cb: () => void) {
  if (toExecute !== null){
    // there is a timer running, add to the list and this function will be executed with that existing timer
    toExecute.push(cb);
    return;
  }
  toExecute = [cb];
  setTimeout(() => {
    runCallbacks();
  },0);
}
