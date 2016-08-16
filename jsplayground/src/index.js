import { sayHi } from './example/greeter.js'
//import testProto from './code_gen/test.js'
import testproto from './proto/test_pb.js'
import { frameMessage, dispatchMessage } from './grpc_browser.js'

var messages = require('./proto/test_pb');


const container = document.getElementById("container");

// Constructing the request
var req = new proto.mwitkow.testproto.PingRequest()
req.setValue('hello')
req.setErrorCodeReturned(2)

function pump(reader, state) {
  return reader.read()
    .then(result => {
      if (result.done) {
        console.log("Read EOF")
        return
      }
      var to = new Uint16Array(result.value)
      var out2 = new Uint8Array(to)
      var count = dispatchMessage(out2.buffer, state)
      console.log("Found " + count + " messages ")
      return pump(reader, state);
    });
}

window.fetch(
  'https://localhost:9090/mwitkow.testproto.TestService/PingList',
  {
    method: 'post',
    headers: new Headers({"Content-Type": "application/grpc", "Grpc-Browser-Compat": "true"}),
    body: frameMessage(req),
    cache: 'none',
  }
).then(function (response) {
  console.log("Got response, starting to pump")
  pump(response.body.getReader(), {position: 0, buffer: null})
}).catch(function (error) {
  console.log("error " + error)
})

container.innerText = sayHi("Michal!2")