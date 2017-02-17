// GENERATED CODE -- DO NOT EDIT!

'use strict';
var test_pb = require('./test_pb.js');

function serialize_mwitkow_testproto_Empty(arg) {
  if (!(arg instanceof test_pb.Empty)) {
    throw new Error('Expected argument of type mwitkow.proto.Empty');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_mwitkow_testproto_Empty(buffer_arg) {
  return test_pb.Empty.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_mwitkow_testproto_PingRequest(arg) {
  if (!(arg instanceof test_pb.PingRequest)) {
    throw new Error('Expected argument of type mwitkow.proto.PingRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_mwitkow_testproto_PingRequest(buffer_arg) {
  return test_pb.PingRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_mwitkow_testproto_PingResponse(arg) {
  if (!(arg instanceof test_pb.PingResponse)) {
    throw new Error('Expected argument of type mwitkow.proto.PingResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_mwitkow_testproto_PingResponse(buffer_arg) {
  return test_pb.PingResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var TestServiceService = exports.TestServiceService = {
  pingEmpty: {
    path: '/mwitkow.proto.TestService/PingEmpty',
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
    path: '/mwitkow.proto.TestService/Ping',
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
    path: '/mwitkow.proto.TestService/PingError',
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
    path: '/mwitkow.proto.TestService/PingList',
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

