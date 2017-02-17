// GENERATED CODE -- DO NOT EDIT!

'use strict';
var mwitkow_grpcweb_test_test_pb = require('../../../mwitkow/grpcweb/test/test_pb.js');

function serialize_Empty(arg) {
  if (!(arg instanceof mwitkow_grpcweb_test_test_pb.Empty)) {
    throw new Error('Expected argument of type Empty');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_Empty(buffer_arg) {
  return mwitkow_grpcweb_test_test_pb.Empty.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_PingRequest(arg) {
  if (!(arg instanceof mwitkow_grpcweb_test_test_pb.PingRequest)) {
    throw new Error('Expected argument of type PingRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_PingRequest(buffer_arg) {
  return mwitkow_grpcweb_test_test_pb.PingRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_PingResponse(arg) {
  if (!(arg instanceof mwitkow_grpcweb_test_test_pb.PingResponse)) {
    throw new Error('Expected argument of type PingResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_PingResponse(buffer_arg) {
  return mwitkow_grpcweb_test_test_pb.PingResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var TestServiceService = exports.TestServiceService = {
  pingEmpty: {
    path: '/mwitkow.grpcweb.test.TestService/PingEmpty',
    requestStream: false,
    responseStream: false,
    requestType: mwitkow_grpcweb_test_test_pb.Empty,
    responseType: mwitkow_grpcweb_test_test_pb.PingResponse,
    requestSerialize: serialize_Empty,
    requestDeserialize: deserialize_Empty,
    responseSerialize: serialize_PingResponse,
    responseDeserialize: deserialize_PingResponse,
  },
  ping: {
    path: '/mwitkow.grpcweb.test.TestService/Ping',
    requestStream: false,
    responseStream: false,
    requestType: mwitkow_grpcweb_test_test_pb.PingRequest,
    responseType: mwitkow_grpcweb_test_test_pb.PingResponse,
    requestSerialize: serialize_PingRequest,
    requestDeserialize: deserialize_PingRequest,
    responseSerialize: serialize_PingResponse,
    responseDeserialize: deserialize_PingResponse,
  },
  pingError: {
    path: '/mwitkow.grpcweb.test.TestService/PingError',
    requestStream: false,
    responseStream: false,
    requestType: mwitkow_grpcweb_test_test_pb.PingRequest,
    responseType: mwitkow_grpcweb_test_test_pb.Empty,
    requestSerialize: serialize_PingRequest,
    requestDeserialize: deserialize_PingRequest,
    responseSerialize: serialize_Empty,
    responseDeserialize: deserialize_Empty,
  },
  pingList: {
    path: '/mwitkow.grpcweb.test.TestService/PingList',
    requestStream: false,
    responseStream: true,
    requestType: mwitkow_grpcweb_test_test_pb.PingRequest,
    responseType: mwitkow_grpcweb_test_test_pb.PingResponse,
    requestSerialize: serialize_PingRequest,
    requestDeserialize: deserialize_PingRequest,
    responseSerialize: serialize_PingResponse,
    responseDeserialize: deserialize_PingResponse,
  },
};

