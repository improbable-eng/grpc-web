import * as proto_othercom_external_child_message_pb from "../../proto/othercom/external_child_message_pb";
import * as google_protobuf_empty_pb from "google-protobuf/google/protobuf/empty_pb";
import * as proto_examplecom_simple_service_pb from "../../proto/examplecom/simple_service_pb";
declare type SimpleServiceDoUnary = {
    methodName: "DoUnary";
    service: SimpleService;
    requestStream: false;
    responseStream: false;
    requestType: proto_examplecom_simple_service_pb.UnaryRequest;
    responseType: proto_othercom_external_child_message_pb.ExternalChildMessage;
};
declare type SimpleServiceDoServerStream = {
    methodName: "DoServerStream";
    service: SimpleService;
    requestStream: false;
    responseStream: true;
    requestType: proto_examplecom_simple_service_pb.StreamRequest;
    responseType: proto_othercom_external_child_message_pb.ExternalChildMessage;
};
declare type SimpleServiceDoClientStream = {
    methodName: "DoClientStream";
    service: SimpleService;
    requestStream: true;
    responseStream: false;
    requestType: proto_examplecom_simple_service_pb.StreamRequest;
    responseType: google_protobuf_empty_pb.Empty;
};
declare type SimpleServiceDoBidiStream = {
    methodName: "DoBidiStream";
    service: SimpleService;
    requestStream: true;
    responseStream: true;
    requestType: proto_examplecom_simple_service_pb.StreamRequest;
    responseType: proto_othercom_external_child_message_pb.ExternalChildMessage;
};
declare type SimpleServiceDelete = {
    methodName: "Delete";
    service: SimpleService;
    requestStream: false;
    responseStream: false;
    requestType: proto_examplecom_simple_service_pb.UnaryRequest;
    responseType: proto_examplecom_simple_service_pb.UnaryResponse;
};
export declare class SimpleService {
    static readonly serviceName: string;
    static readonly DoUnary: SimpleServiceDoUnary;
    static readonly DoServerStream: SimpleServiceDoServerStream;
    static readonly DoClientStream: SimpleServiceDoClientStream;
    static readonly DoBidiStream: SimpleServiceDoBidiStream;
    static readonly Delete: SimpleServiceDelete;
}
export {};
