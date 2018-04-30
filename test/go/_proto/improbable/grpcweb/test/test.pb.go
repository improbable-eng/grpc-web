// Code generated by protoc-gen-go.
// source: improbable/grpcweb/test/test.proto
// DO NOT EDIT!

/*
Package improbable_grpcweb_test is a generated protocol buffer package.

It is generated from these files:
	improbable/grpcweb/test/test.proto

It has these top-level messages:
	PingRequest
	PingResponse
	TextMessage
	ContinueStreamRequest
	CheckStreamClosedRequest
	CheckStreamClosedResponse
*/
package improbable_grpcweb_test

import proto "github.com/golang/protobuf/proto"
import fmt "fmt"
import math "math"
import google_protobuf "github.com/golang/protobuf/ptypes/empty"

import (
	context "golang.org/x/net/context"
	grpc "google.golang.org/grpc"
)

// Reference imports to suppress errors if they are not otherwise used.
var _ = proto.Marshal
var _ = fmt.Errorf
var _ = math.Inf

// This is a compile-time assertion to ensure that this generated file
// is compatible with the proto package it is being compiled against.
// A compilation error at this line likely means your copy of the
// proto package needs to be updated.
const _ = proto.ProtoPackageIsVersion2 // please upgrade the proto package

type PingRequest_FailureType int32

const (
	PingRequest_NONE         PingRequest_FailureType = 0
	PingRequest_CODE         PingRequest_FailureType = 1
	PingRequest_DROP         PingRequest_FailureType = 2
	PingRequest_CODE_UNICODE PingRequest_FailureType = 3
)

var PingRequest_FailureType_name = map[int32]string{
	0: "NONE",
	1: "CODE",
	2: "DROP",
	3: "CODE_UNICODE",
}
var PingRequest_FailureType_value = map[string]int32{
	"NONE":         0,
	"CODE":         1,
	"DROP":         2,
	"CODE_UNICODE": 3,
}

func (x PingRequest_FailureType) String() string {
	return proto.EnumName(PingRequest_FailureType_name, int32(x))
}
func (PingRequest_FailureType) EnumDescriptor() ([]byte, []int) { return fileDescriptor0, []int{0, 0} }

type PingRequest struct {
	Value             string                  `protobuf:"bytes,1,opt,name=value" json:"value,omitempty"`
	ResponseCount     int32                   `protobuf:"varint,2,opt,name=response_count,json=responseCount" json:"response_count,omitempty"`
	ErrorCodeReturned uint32                  `protobuf:"varint,3,opt,name=error_code_returned,json=errorCodeReturned" json:"error_code_returned,omitempty"`
	FailureType       PingRequest_FailureType `protobuf:"varint,4,opt,name=failure_type,json=failureType,enum=improbable.grpcweb.test.PingRequest_FailureType" json:"failure_type,omitempty"`
	CheckMetadata     bool                    `protobuf:"varint,5,opt,name=check_metadata,json=checkMetadata" json:"check_metadata,omitempty"`
	SendHeaders       bool                    `protobuf:"varint,6,opt,name=send_headers,json=sendHeaders" json:"send_headers,omitempty"`
	SendTrailers      bool                    `protobuf:"varint,7,opt,name=send_trailers,json=sendTrailers" json:"send_trailers,omitempty"`
	StreamIdentifier  string                  `protobuf:"bytes,8,opt,name=stream_identifier,json=streamIdentifier" json:"stream_identifier,omitempty"`
}

func (m *PingRequest) Reset()                    { *m = PingRequest{} }
func (m *PingRequest) String() string            { return proto.CompactTextString(m) }
func (*PingRequest) ProtoMessage()               {}
func (*PingRequest) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{0} }

func (m *PingRequest) GetValue() string {
	if m != nil {
		return m.Value
	}
	return ""
}

func (m *PingRequest) GetResponseCount() int32 {
	if m != nil {
		return m.ResponseCount
	}
	return 0
}

func (m *PingRequest) GetErrorCodeReturned() uint32 {
	if m != nil {
		return m.ErrorCodeReturned
	}
	return 0
}

func (m *PingRequest) GetFailureType() PingRequest_FailureType {
	if m != nil {
		return m.FailureType
	}
	return PingRequest_NONE
}

func (m *PingRequest) GetCheckMetadata() bool {
	if m != nil {
		return m.CheckMetadata
	}
	return false
}

func (m *PingRequest) GetSendHeaders() bool {
	if m != nil {
		return m.SendHeaders
	}
	return false
}

func (m *PingRequest) GetSendTrailers() bool {
	if m != nil {
		return m.SendTrailers
	}
	return false
}

func (m *PingRequest) GetStreamIdentifier() string {
	if m != nil {
		return m.StreamIdentifier
	}
	return ""
}

type PingResponse struct {
	Value   string `protobuf:"bytes,1,opt,name=Value" json:"Value,omitempty"`
	Counter int32  `protobuf:"varint,2,opt,name=counter" json:"counter,omitempty"`
}

func (m *PingResponse) Reset()                    { *m = PingResponse{} }
func (m *PingResponse) String() string            { return proto.CompactTextString(m) }
func (*PingResponse) ProtoMessage()               {}
func (*PingResponse) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{1} }

func (m *PingResponse) GetValue() string {
	if m != nil {
		return m.Value
	}
	return ""
}

func (m *PingResponse) GetCounter() int32 {
	if m != nil {
		return m.Counter
	}
	return 0
}

type TextMessage struct {
	Text         string `protobuf:"bytes,1,opt,name=text" json:"text,omitempty"`
	SendHeaders  bool   `protobuf:"varint,2,opt,name=send_headers,json=sendHeaders" json:"send_headers,omitempty"`
	SendTrailers bool   `protobuf:"varint,3,opt,name=send_trailers,json=sendTrailers" json:"send_trailers,omitempty"`
}

func (m *TextMessage) Reset()                    { *m = TextMessage{} }
func (m *TextMessage) String() string            { return proto.CompactTextString(m) }
func (*TextMessage) ProtoMessage()               {}
func (*TextMessage) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{2} }

func (m *TextMessage) GetText() string {
	if m != nil {
		return m.Text
	}
	return ""
}

func (m *TextMessage) GetSendHeaders() bool {
	if m != nil {
		return m.SendHeaders
	}
	return false
}

func (m *TextMessage) GetSendTrailers() bool {
	if m != nil {
		return m.SendTrailers
	}
	return false
}

type ContinueStreamRequest struct {
	StreamIdentifier string `protobuf:"bytes,1,opt,name=stream_identifier,json=streamIdentifier" json:"stream_identifier,omitempty"`
}

func (m *ContinueStreamRequest) Reset()                    { *m = ContinueStreamRequest{} }
func (m *ContinueStreamRequest) String() string            { return proto.CompactTextString(m) }
func (*ContinueStreamRequest) ProtoMessage()               {}
func (*ContinueStreamRequest) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{3} }

func (m *ContinueStreamRequest) GetStreamIdentifier() string {
	if m != nil {
		return m.StreamIdentifier
	}
	return ""
}

type CheckStreamClosedRequest struct {
	StreamIdentifier string `protobuf:"bytes,1,opt,name=stream_identifier,json=streamIdentifier" json:"stream_identifier,omitempty"`
}

func (m *CheckStreamClosedRequest) Reset()                    { *m = CheckStreamClosedRequest{} }
func (m *CheckStreamClosedRequest) String() string            { return proto.CompactTextString(m) }
func (*CheckStreamClosedRequest) ProtoMessage()               {}
func (*CheckStreamClosedRequest) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{4} }

func (m *CheckStreamClosedRequest) GetStreamIdentifier() string {
	if m != nil {
		return m.StreamIdentifier
	}
	return ""
}

type CheckStreamClosedResponse struct {
	Closed bool `protobuf:"varint,1,opt,name=closed" json:"closed,omitempty"`
}

func (m *CheckStreamClosedResponse) Reset()                    { *m = CheckStreamClosedResponse{} }
func (m *CheckStreamClosedResponse) String() string            { return proto.CompactTextString(m) }
func (*CheckStreamClosedResponse) ProtoMessage()               {}
func (*CheckStreamClosedResponse) Descriptor() ([]byte, []int) { return fileDescriptor0, []int{5} }

func (m *CheckStreamClosedResponse) GetClosed() bool {
	if m != nil {
		return m.Closed
	}
	return false
}

func init() {
	proto.RegisterType((*PingRequest)(nil), "improbable.grpcweb.test.PingRequest")
	proto.RegisterType((*PingResponse)(nil), "improbable.grpcweb.test.PingResponse")
	proto.RegisterType((*TextMessage)(nil), "improbable.grpcweb.test.TextMessage")
	proto.RegisterType((*ContinueStreamRequest)(nil), "improbable.grpcweb.test.ContinueStreamRequest")
	proto.RegisterType((*CheckStreamClosedRequest)(nil), "improbable.grpcweb.test.CheckStreamClosedRequest")
	proto.RegisterType((*CheckStreamClosedResponse)(nil), "improbable.grpcweb.test.CheckStreamClosedResponse")
	proto.RegisterEnum("improbable.grpcweb.test.PingRequest_FailureType", PingRequest_FailureType_name, PingRequest_FailureType_value)
}

// Reference imports to suppress errors if they are not otherwise used.
var _ context.Context
var _ grpc.ClientConn

// This is a compile-time assertion to ensure that this generated file
// is compatible with the grpc package it is being compiled against.
const _ = grpc.SupportPackageIsVersion4

// Client API for TestService service

type TestServiceClient interface {
	PingEmpty(ctx context.Context, in *google_protobuf.Empty, opts ...grpc.CallOption) (*PingResponse, error)
	Ping(ctx context.Context, in *PingRequest, opts ...grpc.CallOption) (*PingResponse, error)
	PingError(ctx context.Context, in *PingRequest, opts ...grpc.CallOption) (*google_protobuf.Empty, error)
	PingList(ctx context.Context, in *PingRequest, opts ...grpc.CallOption) (TestService_PingListClient, error)
	PingPongBidi(ctx context.Context, opts ...grpc.CallOption) (TestService_PingPongBidiClient, error)
	PingStream(ctx context.Context, opts ...grpc.CallOption) (TestService_PingStreamClient, error)
	Echo(ctx context.Context, in *TextMessage, opts ...grpc.CallOption) (*TextMessage, error)
}

type testServiceClient struct {
	cc *grpc.ClientConn
}

func NewTestServiceClient(cc *grpc.ClientConn) TestServiceClient {
	return &testServiceClient{cc}
}

func (c *testServiceClient) PingEmpty(ctx context.Context, in *google_protobuf.Empty, opts ...grpc.CallOption) (*PingResponse, error) {
	out := new(PingResponse)
	err := grpc.Invoke(ctx, "/improbable.grpcweb.test.TestService/PingEmpty", in, out, c.cc, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (c *testServiceClient) Ping(ctx context.Context, in *PingRequest, opts ...grpc.CallOption) (*PingResponse, error) {
	out := new(PingResponse)
	err := grpc.Invoke(ctx, "/improbable.grpcweb.test.TestService/Ping", in, out, c.cc, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (c *testServiceClient) PingError(ctx context.Context, in *PingRequest, opts ...grpc.CallOption) (*google_protobuf.Empty, error) {
	out := new(google_protobuf.Empty)
	err := grpc.Invoke(ctx, "/improbable.grpcweb.test.TestService/PingError", in, out, c.cc, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (c *testServiceClient) PingList(ctx context.Context, in *PingRequest, opts ...grpc.CallOption) (TestService_PingListClient, error) {
	stream, err := grpc.NewClientStream(ctx, &_TestService_serviceDesc.Streams[0], c.cc, "/improbable.grpcweb.test.TestService/PingList", opts...)
	if err != nil {
		return nil, err
	}
	x := &testServicePingListClient{stream}
	if err := x.ClientStream.SendMsg(in); err != nil {
		return nil, err
	}
	if err := x.ClientStream.CloseSend(); err != nil {
		return nil, err
	}
	return x, nil
}

type TestService_PingListClient interface {
	Recv() (*PingResponse, error)
	grpc.ClientStream
}

type testServicePingListClient struct {
	grpc.ClientStream
}

func (x *testServicePingListClient) Recv() (*PingResponse, error) {
	m := new(PingResponse)
	if err := x.ClientStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

func (c *testServiceClient) PingPongBidi(ctx context.Context, opts ...grpc.CallOption) (TestService_PingPongBidiClient, error) {
	stream, err := grpc.NewClientStream(ctx, &_TestService_serviceDesc.Streams[1], c.cc, "/improbable.grpcweb.test.TestService/PingPongBidi", opts...)
	if err != nil {
		return nil, err
	}
	x := &testServicePingPongBidiClient{stream}
	return x, nil
}

type TestService_PingPongBidiClient interface {
	Send(*PingRequest) error
	Recv() (*PingResponse, error)
	grpc.ClientStream
}

type testServicePingPongBidiClient struct {
	grpc.ClientStream
}

func (x *testServicePingPongBidiClient) Send(m *PingRequest) error {
	return x.ClientStream.SendMsg(m)
}

func (x *testServicePingPongBidiClient) Recv() (*PingResponse, error) {
	m := new(PingResponse)
	if err := x.ClientStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

func (c *testServiceClient) PingStream(ctx context.Context, opts ...grpc.CallOption) (TestService_PingStreamClient, error) {
	stream, err := grpc.NewClientStream(ctx, &_TestService_serviceDesc.Streams[2], c.cc, "/improbable.grpcweb.test.TestService/PingStream", opts...)
	if err != nil {
		return nil, err
	}
	x := &testServicePingStreamClient{stream}
	return x, nil
}

type TestService_PingStreamClient interface {
	Send(*PingRequest) error
	CloseAndRecv() (*PingResponse, error)
	grpc.ClientStream
}

type testServicePingStreamClient struct {
	grpc.ClientStream
}

func (x *testServicePingStreamClient) Send(m *PingRequest) error {
	return x.ClientStream.SendMsg(m)
}

func (x *testServicePingStreamClient) CloseAndRecv() (*PingResponse, error) {
	if err := x.ClientStream.CloseSend(); err != nil {
		return nil, err
	}
	m := new(PingResponse)
	if err := x.ClientStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

func (c *testServiceClient) Echo(ctx context.Context, in *TextMessage, opts ...grpc.CallOption) (*TextMessage, error) {
	out := new(TextMessage)
	err := grpc.Invoke(ctx, "/improbable.grpcweb.test.TestService/Echo", in, out, c.cc, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

// Server API for TestService service

type TestServiceServer interface {
	PingEmpty(context.Context, *google_protobuf.Empty) (*PingResponse, error)
	Ping(context.Context, *PingRequest) (*PingResponse, error)
	PingError(context.Context, *PingRequest) (*google_protobuf.Empty, error)
	PingList(*PingRequest, TestService_PingListServer) error
	PingPongBidi(TestService_PingPongBidiServer) error
	PingStream(TestService_PingStreamServer) error
	Echo(context.Context, *TextMessage) (*TextMessage, error)
}

func RegisterTestServiceServer(s *grpc.Server, srv TestServiceServer) {
	s.RegisterService(&_TestService_serviceDesc, srv)
}

func _TestService_PingEmpty_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(google_protobuf.Empty)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(TestServiceServer).PingEmpty(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/improbable.grpcweb.test.TestService/PingEmpty",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(TestServiceServer).PingEmpty(ctx, req.(*google_protobuf.Empty))
	}
	return interceptor(ctx, in, info, handler)
}

func _TestService_Ping_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(PingRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(TestServiceServer).Ping(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/improbable.grpcweb.test.TestService/Ping",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(TestServiceServer).Ping(ctx, req.(*PingRequest))
	}
	return interceptor(ctx, in, info, handler)
}

func _TestService_PingError_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(PingRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(TestServiceServer).PingError(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/improbable.grpcweb.test.TestService/PingError",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(TestServiceServer).PingError(ctx, req.(*PingRequest))
	}
	return interceptor(ctx, in, info, handler)
}

func _TestService_PingList_Handler(srv interface{}, stream grpc.ServerStream) error {
	m := new(PingRequest)
	if err := stream.RecvMsg(m); err != nil {
		return err
	}
	return srv.(TestServiceServer).PingList(m, &testServicePingListServer{stream})
}

type TestService_PingListServer interface {
	Send(*PingResponse) error
	grpc.ServerStream
}

type testServicePingListServer struct {
	grpc.ServerStream
}

func (x *testServicePingListServer) Send(m *PingResponse) error {
	return x.ServerStream.SendMsg(m)
}

func _TestService_PingPongBidi_Handler(srv interface{}, stream grpc.ServerStream) error {
	return srv.(TestServiceServer).PingPongBidi(&testServicePingPongBidiServer{stream})
}

type TestService_PingPongBidiServer interface {
	Send(*PingResponse) error
	Recv() (*PingRequest, error)
	grpc.ServerStream
}

type testServicePingPongBidiServer struct {
	grpc.ServerStream
}

func (x *testServicePingPongBidiServer) Send(m *PingResponse) error {
	return x.ServerStream.SendMsg(m)
}

func (x *testServicePingPongBidiServer) Recv() (*PingRequest, error) {
	m := new(PingRequest)
	if err := x.ServerStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

func _TestService_PingStream_Handler(srv interface{}, stream grpc.ServerStream) error {
	return srv.(TestServiceServer).PingStream(&testServicePingStreamServer{stream})
}

type TestService_PingStreamServer interface {
	SendAndClose(*PingResponse) error
	Recv() (*PingRequest, error)
	grpc.ServerStream
}

type testServicePingStreamServer struct {
	grpc.ServerStream
}

func (x *testServicePingStreamServer) SendAndClose(m *PingResponse) error {
	return x.ServerStream.SendMsg(m)
}

func (x *testServicePingStreamServer) Recv() (*PingRequest, error) {
	m := new(PingRequest)
	if err := x.ServerStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

func _TestService_Echo_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(TextMessage)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(TestServiceServer).Echo(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/improbable.grpcweb.test.TestService/Echo",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(TestServiceServer).Echo(ctx, req.(*TextMessage))
	}
	return interceptor(ctx, in, info, handler)
}

var _TestService_serviceDesc = grpc.ServiceDesc{
	ServiceName: "improbable.grpcweb.test.TestService",
	HandlerType: (*TestServiceServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "PingEmpty",
			Handler:    _TestService_PingEmpty_Handler,
		},
		{
			MethodName: "Ping",
			Handler:    _TestService_Ping_Handler,
		},
		{
			MethodName: "PingError",
			Handler:    _TestService_PingError_Handler,
		},
		{
			MethodName: "Echo",
			Handler:    _TestService_Echo_Handler,
		},
	},
	Streams: []grpc.StreamDesc{
		{
			StreamName:    "PingList",
			Handler:       _TestService_PingList_Handler,
			ServerStreams: true,
		},
		{
			StreamName:    "PingPongBidi",
			Handler:       _TestService_PingPongBidi_Handler,
			ServerStreams: true,
			ClientStreams: true,
		},
		{
			StreamName:    "PingStream",
			Handler:       _TestService_PingStream_Handler,
			ClientStreams: true,
		},
	},
	Metadata: "improbable/grpcweb/test/test.proto",
}

// Client API for TestUtilService service

type TestUtilServiceClient interface {
	ContinueStream(ctx context.Context, in *ContinueStreamRequest, opts ...grpc.CallOption) (*google_protobuf.Empty, error)
	CheckStreamClosed(ctx context.Context, in *CheckStreamClosedRequest, opts ...grpc.CallOption) (*CheckStreamClosedResponse, error)
}

type testUtilServiceClient struct {
	cc *grpc.ClientConn
}

func NewTestUtilServiceClient(cc *grpc.ClientConn) TestUtilServiceClient {
	return &testUtilServiceClient{cc}
}

func (c *testUtilServiceClient) ContinueStream(ctx context.Context, in *ContinueStreamRequest, opts ...grpc.CallOption) (*google_protobuf.Empty, error) {
	out := new(google_protobuf.Empty)
	err := grpc.Invoke(ctx, "/improbable.grpcweb.test.TestUtilService/ContinueStream", in, out, c.cc, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (c *testUtilServiceClient) CheckStreamClosed(ctx context.Context, in *CheckStreamClosedRequest, opts ...grpc.CallOption) (*CheckStreamClosedResponse, error) {
	out := new(CheckStreamClosedResponse)
	err := grpc.Invoke(ctx, "/improbable.grpcweb.test.TestUtilService/CheckStreamClosed", in, out, c.cc, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

// Server API for TestUtilService service

type TestUtilServiceServer interface {
	ContinueStream(context.Context, *ContinueStreamRequest) (*google_protobuf.Empty, error)
	CheckStreamClosed(context.Context, *CheckStreamClosedRequest) (*CheckStreamClosedResponse, error)
}

func RegisterTestUtilServiceServer(s *grpc.Server, srv TestUtilServiceServer) {
	s.RegisterService(&_TestUtilService_serviceDesc, srv)
}

func _TestUtilService_ContinueStream_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(ContinueStreamRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(TestUtilServiceServer).ContinueStream(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/improbable.grpcweb.test.TestUtilService/ContinueStream",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(TestUtilServiceServer).ContinueStream(ctx, req.(*ContinueStreamRequest))
	}
	return interceptor(ctx, in, info, handler)
}

func _TestUtilService_CheckStreamClosed_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(CheckStreamClosedRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(TestUtilServiceServer).CheckStreamClosed(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/improbable.grpcweb.test.TestUtilService/CheckStreamClosed",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(TestUtilServiceServer).CheckStreamClosed(ctx, req.(*CheckStreamClosedRequest))
	}
	return interceptor(ctx, in, info, handler)
}

var _TestUtilService_serviceDesc = grpc.ServiceDesc{
	ServiceName: "improbable.grpcweb.test.TestUtilService",
	HandlerType: (*TestUtilServiceServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "ContinueStream",
			Handler:    _TestUtilService_ContinueStream_Handler,
		},
		{
			MethodName: "CheckStreamClosed",
			Handler:    _TestUtilService_CheckStreamClosed_Handler,
		},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: "improbable/grpcweb/test/test.proto",
}

// Client API for FailService service

type FailServiceClient interface {
	NonExistant(ctx context.Context, in *PingRequest, opts ...grpc.CallOption) (*PingResponse, error)
}

type failServiceClient struct {
	cc *grpc.ClientConn
}

func NewFailServiceClient(cc *grpc.ClientConn) FailServiceClient {
	return &failServiceClient{cc}
}

func (c *failServiceClient) NonExistant(ctx context.Context, in *PingRequest, opts ...grpc.CallOption) (*PingResponse, error) {
	out := new(PingResponse)
	err := grpc.Invoke(ctx, "/improbable.grpcweb.test.FailService/NonExistant", in, out, c.cc, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

// Server API for FailService service

type FailServiceServer interface {
	NonExistant(context.Context, *PingRequest) (*PingResponse, error)
}

func RegisterFailServiceServer(s *grpc.Server, srv FailServiceServer) {
	s.RegisterService(&_FailService_serviceDesc, srv)
}

func _FailService_NonExistant_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(PingRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(FailServiceServer).NonExistant(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/improbable.grpcweb.test.FailService/NonExistant",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(FailServiceServer).NonExistant(ctx, req.(*PingRequest))
	}
	return interceptor(ctx, in, info, handler)
}

var _FailService_serviceDesc = grpc.ServiceDesc{
	ServiceName: "improbable.grpcweb.test.FailService",
	HandlerType: (*FailServiceServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "NonExistant",
			Handler:    _FailService_NonExistant_Handler,
		},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: "improbable/grpcweb/test/test.proto",
}

func init() { proto.RegisterFile("improbable/grpcweb/test/test.proto", fileDescriptor0) }

var fileDescriptor0 = []byte{
	// 662 bytes of a gzipped FileDescriptorProto
	0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0xff, 0xac, 0x54, 0xcd, 0x6e, 0xd3, 0x40,
	0x10, 0x8e, 0x9b, 0xb4, 0x4d, 0x27, 0x49, 0x49, 0x17, 0x28, 0x26, 0x5c, 0x82, 0xa1, 0x52, 0x24,
	0x24, 0xa7, 0xa4, 0x67, 0x38, 0x90, 0x06, 0xa8, 0x68, 0xd3, 0xca, 0x4d, 0x39, 0xf0, 0x23, 0xcb,
	0xb1, 0x27, 0xe9, 0xaa, 0x8e, 0xd7, 0xac, 0xd7, 0xa5, 0x95, 0x78, 0x22, 0x5e, 0x8d, 0x2b, 0x0f,
	0x80, 0x76, 0xd7, 0xa6, 0x41, 0x6d, 0x4a, 0x40, 0xb9, 0x58, 0x3b, 0xdf, 0xfc, 0xec, 0xec, 0x37,
	0xf3, 0x19, 0x2c, 0x3a, 0x89, 0x39, 0x1b, 0x7a, 0xc3, 0x10, 0xdb, 0x63, 0x1e, 0xfb, 0x5f, 0x71,
	0xd8, 0x16, 0x98, 0x08, 0xf5, 0xb1, 0x63, 0xce, 0x04, 0x23, 0x0f, 0xae, 0x62, 0xec, 0x2c, 0xc6,
	0x96, 0xee, 0xc6, 0xa3, 0x31, 0x63, 0xe3, 0x10, 0xdb, 0x2a, 0x6c, 0x98, 0x8e, 0xda, 0x38, 0x89,
	0xc5, 0xa5, 0xce, 0xb2, 0xbe, 0x17, 0xa1, 0x72, 0x44, 0xa3, 0xb1, 0x83, 0x5f, 0x52, 0x4c, 0x04,
	0xb9, 0x07, 0xcb, 0xe7, 0x5e, 0x98, 0xa2, 0x69, 0x34, 0x8d, 0xd6, 0x9a, 0xa3, 0x0d, 0xb2, 0x05,
	0xeb, 0x1c, 0x93, 0x98, 0x45, 0x09, 0xba, 0x3e, 0x4b, 0x23, 0x61, 0x2e, 0x35, 0x8d, 0xd6, 0xb2,
	0x53, 0xcb, 0xd1, 0xae, 0x04, 0x89, 0x0d, 0x77, 0x91, 0x73, 0xc6, 0x5d, 0x9f, 0x05, 0xe8, 0x72,
	0x14, 0x29, 0x8f, 0x30, 0x30, 0x8b, 0x4d, 0xa3, 0x55, 0x73, 0x36, 0x94, 0xab, 0xcb, 0x02, 0x74,
	0x32, 0x07, 0x39, 0x86, 0xea, 0xc8, 0xa3, 0x61, 0xca, 0xd1, 0x15, 0x97, 0x31, 0x9a, 0xa5, 0xa6,
	0xd1, 0x5a, 0xef, 0x6c, 0xdb, 0x33, 0x5e, 0x62, 0x4f, 0x35, 0x6a, 0xbf, 0xd6, 0x89, 0x83, 0xcb,
	0x18, 0x9d, 0xca, 0xe8, 0xca, 0x90, 0xbd, 0xfa, 0xa7, 0xe8, 0x9f, 0xb9, 0x13, 0x14, 0x5e, 0xe0,
	0x09, 0xcf, 0x5c, 0x6e, 0x1a, 0xad, 0xb2, 0x53, 0x53, 0xe8, 0x41, 0x06, 0x92, 0xc7, 0x50, 0x4d,
	0x30, 0x0a, 0xdc, 0x53, 0xf4, 0x02, 0xe4, 0x89, 0xb9, 0xa2, 0x82, 0x2a, 0x12, 0x7b, 0xab, 0x21,
	0xf2, 0x04, 0x6a, 0x2a, 0x44, 0x70, 0x8f, 0x86, 0x32, 0x66, 0x55, 0xc5, 0xa8, 0xbc, 0x41, 0x86,
	0x91, 0x67, 0xb0, 0x91, 0x08, 0x8e, 0xde, 0xc4, 0xa5, 0x01, 0x46, 0x82, 0x8e, 0x28, 0x72, 0xb3,
	0xac, 0xc8, 0xab, 0x6b, 0xc7, 0xde, 0x6f, 0xdc, 0x7a, 0x01, 0x95, 0xa9, 0xbe, 0x49, 0x19, 0x4a,
	0xfd, 0xc3, 0x7e, 0xaf, 0x5e, 0x90, 0xa7, 0xee, 0xe1, 0x6e, 0xaf, 0x6e, 0xc8, 0xd3, 0xae, 0x73,
	0x78, 0x54, 0x5f, 0x22, 0x75, 0xa8, 0x4a, 0xcc, 0x3d, 0xe9, 0xef, 0x29, 0x5f, 0xd1, 0x7a, 0x09,
	0x55, 0x4d, 0x81, 0x26, 0x5d, 0x0e, 0xeb, 0xfd, 0xf4, 0xb0, 0x94, 0x41, 0x4c, 0x58, 0x55, 0x33,
	0x42, 0x9e, 0x4d, 0x29, 0x37, 0x2d, 0x0a, 0x95, 0x01, 0x5e, 0x88, 0x03, 0x4c, 0x12, 0x6f, 0x8c,
	0x84, 0x40, 0x49, 0xe0, 0x85, 0xc8, 0xb2, 0xd5, 0xf9, 0x1a, 0x2d, 0x4b, 0x73, 0xd0, 0x52, 0xbc,
	0x4e, 0x8b, 0xb5, 0x0b, 0xf7, 0xbb, 0x2c, 0x12, 0x34, 0x4a, 0xf1, 0x58, 0xb1, 0x90, 0x2f, 0xd8,
	0x8d, 0x7c, 0x19, 0x33, 0xf8, 0x7a, 0x03, 0x66, 0x57, 0x4e, 0x4d, 0x97, 0xe8, 0x86, 0x2c, 0xc1,
	0xe0, 0xbf, 0x0a, 0xed, 0xc0, 0xc3, 0x1b, 0x0a, 0x65, 0x34, 0x6e, 0xc2, 0x8a, 0xaf, 0x10, 0x95,
	0x5e, 0x76, 0x32, 0xab, 0xf3, 0xb3, 0x24, 0xf9, 0x4a, 0xc4, 0x31, 0xf2, 0x73, 0xea, 0x23, 0xd9,
	0x87, 0x35, 0x49, 0x7f, 0x4f, 0xca, 0x87, 0x6c, 0xda, 0x5a, 0x56, 0x76, 0x2e, 0x2b, 0x5b, 0xe1,
	0x8d, 0xad, 0xbf, 0x6c, 0xaf, 0xbe, 0xd3, 0x2a, 0x90, 0x13, 0x28, 0x49, 0x84, 0x3c, 0x9d, 0x67,
	0xdd, 0xe7, 0x2f, 0xfb, 0x2e, 0x6b, 0x52, 0x8a, 0x6d, 0xce, 0xda, 0x33, 0x9e, 0x62, 0x15, 0xc8,
	0x47, 0x28, 0xcb, 0xc0, 0x7d, 0x9a, 0x88, 0x05, 0xf7, 0xb9, 0x6d, 0x10, 0x4f, 0x6f, 0xf3, 0x11,
	0x8b, 0xc6, 0xaf, 0x68, 0x40, 0x17, 0x7c, 0x41, 0xcb, 0xd8, 0x36, 0xc8, 0x67, 0x00, 0x89, 0xea,
	0xa9, 0x2f, 0xfc, 0x02, 0x32, 0x80, 0x52, 0xcf, 0x3f, 0x65, 0xb7, 0x14, 0x9e, 0x92, 0x5b, 0x63,
	0xae, 0x28, 0xab, 0xd0, 0xf9, 0x61, 0xc0, 0x1d, 0xb9, 0x76, 0x27, 0x82, 0x86, 0xf9, 0xea, 0x7d,
	0x80, 0xf5, 0x3f, 0xe5, 0x44, 0xec, 0x99, 0xd5, 0x6e, 0xd4, 0xdd, 0x2d, 0x43, 0xfe, 0x06, 0x1b,
	0xd7, 0xb4, 0x41, 0x9e, 0xcf, 0x2e, 0x3f, 0x43, 0x90, 0x8d, 0xce, 0xbf, 0xa4, 0xe4, 0x2c, 0x76,
	0xce, 0xf4, 0x2f, 0x31, 0x7f, 0xe8, 0x27, 0xa8, 0xf4, 0x59, 0xd4, 0xbb, 0xa0, 0x89, 0xf0, 0xa2,
	0x45, 0x2f, 0xdd, 0x70, 0x45, 0x3d, 0x7e, 0xe7, 0x57, 0x00, 0x00, 0x00, 0xff, 0xff, 0x63, 0xef,
	0x91, 0x01, 0x50, 0x07, 0x00, 0x00,
}
