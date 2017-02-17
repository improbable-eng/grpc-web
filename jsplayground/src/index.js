import * as grpc from './grpc-polyfill';
import { TestServiceService } from './proto/test_grpc_pb.js';

const container = document.getElementById("container");

// Constructing the request
const req = new proto.mwitkow.testproto.PingRequest();
req.setValue('hello');
req.setErrorCodeReturned(2);

const TestServiceClient = grpc.makeGenericClientConstructor(TestServiceService);

// Make a unary request
const client = new TestServiceClient('https://localhost:9090');
client.ping(req, function(err, resp) {
  console.log("ping complete");
  console.dir(err);
  console.dir(resp);
});


client.pingError(req, function(err, resp) {
    console.log("ping complete");
    console.dir(err);
    console.dir(resp);
});


// Make a server-streaming request
client.pingList(req, function(err, resp) {
    console.log("pingList complete");
    console.dir(err);
    console.dir(resp);
});