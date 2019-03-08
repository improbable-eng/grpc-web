"use strict";
exports.__esModule = true;
var proto_othercom_external_child_message_pb = require("../../proto/othercom/external_child_message_pb");
var google_protobuf_empty_pb = require("google-protobuf/google/protobuf/empty_pb");
var proto_examplecom_simple_service_pb = require("../../proto/examplecom/simple_service_pb");
var SimpleService = /** @class */ (function () {
    function SimpleService() {
    }
    SimpleService.serviceName = "SimpleService";
    SimpleService.DoUnary = {
        methodName: "DoUnary",
        service: SimpleService,
        requestStream: false,
        responseStream: false,
        requestType: proto_examplecom_simple_service_pb.UnaryRequest,
        responseType: proto_othercom_external_child_message_pb.ExternalChildMessage
    };
    SimpleService.DoServerStream = {
        methodName: "DoServerStream",
        service: SimpleService,
        requestStream: false,
        responseStream: true,
        requestType: proto_examplecom_simple_service_pb.StreamRequest,
        responseType: proto_othercom_external_child_message_pb.ExternalChildMessage
    };
    SimpleService.DoClientStream = {
        methodName: "DoClientStream",
        service: SimpleService,
        requestStream: true,
        responseStream: false,
        requestType: proto_examplecom_simple_service_pb.StreamRequest,
        responseType: google_protobuf_empty_pb.Empty
    };
    SimpleService.DoBidiStream = {
        methodName: "DoBidiStream",
        service: SimpleService,
        requestStream: true,
        responseStream: true,
        requestType: proto_examplecom_simple_service_pb.StreamRequest,
        responseType: proto_othercom_external_child_message_pb.ExternalChildMessage
    };
    SimpleService.Delete = {
        methodName: "Delete",
        service: SimpleService,
        requestStream: false,
        responseStream: false,
        requestType: proto_examplecom_simple_service_pb.UnaryRequest,
        responseType: proto_examplecom_simple_service_pb.UnaryResponse
    };
    return SimpleService;
}());
exports.SimpleService = SimpleService;
