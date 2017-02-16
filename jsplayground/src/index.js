var protobufjs = require('protobufjs');

/*
var testProto = require('raw!../../cmd/testproto/test.proto');
var nestedProto = require('raw!../../cmd/testproto/nested/somenested.proto');

var nestedBuilder = protobufjs.loadProto(nestedProto, "./nested/somenested.proto");
var builder = protobufjs.loadProto(testProto, nestedBuilder, "./test.proto");
*/

var testProto = require('./test.proto.json');
var builder = protobufjs.loadJson(testProto, './test.proto');

console.dir(builder);


//import testProto from './code_gen/test.js'

/*
import testproto from './proto/test_pb.js'
import { frameMessage, dispatchMessage } from './grpc_browser.js'
import { TestServiceClient } from './proto/test_grpc_pb.js';

var messages = require('./proto/test_pb');


const container = document.getElementById("container");

// Constructing the request
var req = new proto.mwitkow.testproto.PingRequest()
req.setValue('hello')
req.setErrorCodeReturned(2)


var client = new TestServiceClient('https://localhost:9090');
client.ping(req, function(err, resp) {
	console.log("ping complete")
  console.dir(err);
  console.dir(resp);
});
*/