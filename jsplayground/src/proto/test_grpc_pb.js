// GENERATED CODE -- DO NOT EDIT!

'use strict';
var test_pb = require('./test_pb.js');

function serialize_mwitkow_testproto_Empty(arg) {
  if (!(arg instanceof test_pb.Empty)) {
    throw new Error('Expected argument of type mwitkow.testproto.Empty');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_mwitkow_testproto_Empty(buffer_arg) {
  return test_pb.Empty.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_mwitkow_testproto_PingRequest(arg) {
  if (!(arg instanceof test_pb.PingRequest)) {
    throw new Error('Expected argument of type mwitkow.testproto.PingRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_mwitkow_testproto_PingRequest(buffer_arg) {
  return test_pb.PingRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_mwitkow_testproto_PingResponse(arg) {
  if (!(arg instanceof test_pb.PingResponse)) {
    throw new Error('Expected argument of type mwitkow.testproto.PingResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_mwitkow_testproto_PingResponse(buffer_arg) {
  return test_pb.PingResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var TestServiceService = exports.TestServiceService = {
  pingEmpty: {
    path: '/mwitkow.testproto.TestService/PingEmpty',
    requestStream: false,
    responseStream: false,
    requestType: test_pb.Empty,
    responseType: test_pb.PingResponse,
    requestSerialize: serialize_mwitkow_testproto_Empty,
    requestDeserialize: deserialize_mwitkow_testproto_Empty,
    responseSerialize: serialize_mwitkow_testproto_PingResponse,
    responseDeserialize: deserialize_mwitkow_testproto_PingResponse,
  },
  ping: {
    path: '/mwitkow.testproto.TestService/Ping',
    requestStream: false,
    responseStream: false,
    requestType: test_pb.PingRequest,
    responseType: test_pb.PingResponse,
    requestSerialize: serialize_mwitkow_testproto_PingRequest,
    requestDeserialize: deserialize_mwitkow_testproto_PingRequest,
    responseSerialize: serialize_mwitkow_testproto_PingResponse,
    responseDeserialize: deserialize_mwitkow_testproto_PingResponse,
  },
  pingError: {
    path: '/mwitkow.testproto.TestService/PingError',
    requestStream: false,
    responseStream: false,
    requestType: test_pb.PingRequest,
    responseType: test_pb.Empty,
    requestSerialize: serialize_mwitkow_testproto_PingRequest,
    requestDeserialize: deserialize_mwitkow_testproto_PingRequest,
    responseSerialize: serialize_mwitkow_testproto_Empty,
    responseDeserialize: deserialize_mwitkow_testproto_Empty,
  },
  pingList: {
    path: '/mwitkow.testproto.TestService/PingList',
    requestStream: false,
    responseStream: true,
    requestType: test_pb.PingRequest,
    responseType: test_pb.PingResponse,
    requestSerialize: serialize_mwitkow_testproto_PingRequest,
    requestDeserialize: deserialize_mwitkow_testproto_PingRequest,
    responseSerialize: serialize_mwitkow_testproto_PingResponse,
    responseDeserialize: deserialize_mwitkow_testproto_PingResponse,
  },
};

