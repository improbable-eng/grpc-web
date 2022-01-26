//Copyright 2017 Improbable. All Rights Reserved.
// See LICENSE for licensing terms.

package grpcweb_test

import (
	"bufio"
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/golang/protobuf/proto"
	google_protobuf "github.com/golang/protobuf/ptypes/empty"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	testproto "github.com/improbable-eng/grpc-web/integration_test/go/_proto/improbable/grpcweb/test"
	"github.com/mwitkow/go-conntrack/connhelpers"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
	"golang.org/x/net/context"
	"golang.org/x/net/http2"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/grpclog"
	"google.golang.org/grpc/metadata"
)

var (
	expectedListResponses = 3000
	expectedHeaders       = metadata.Pairs("HeaderTestKey1", "Value1", "HeaderTestKey2", "Value2")
	expectedTrailers      = metadata.Pairs("TrailerTestKey1", "Value1", "TrailerTestKey2", "Value2")
	useFlushForHeaders    = "test-internal-use-flush-for-headers"
)

const (
	grpcWebContentType     = "application/grpc-web"
	grpcWebTextContentType = "application/grpc-web-text"
)

type GrpcWebWrapperTestSuite struct {
	suite.Suite
	httpMajorVersion int
	listener         net.Listener
	grpcServer       *grpc.Server
	wrappedServer    *grpcweb.WrappedGrpcServer
}

func TestHttp2GrpcWebWrapperTestSuite(t *testing.T) {
	suite.Run(t, &GrpcWebWrapperTestSuite{httpMajorVersion: 2})
}

func TestHttp1GrpcWebWrapperTestSuite(t *testing.T) {
	suite.Run(t, &GrpcWebWrapperTestSuite{httpMajorVersion: 1})
}

func TestNonRootResource(t *testing.T) {
	grpcServer := grpc.NewServer()
	testproto.RegisterTestServiceServer(grpcServer, &testServiceImpl{})
	wrappedServer := grpcweb.WrapServer(grpcServer,
		grpcweb.WithAllowNonRootResource(true),
		grpcweb.WithOriginFunc(func(origin string) bool {
			return true
		}))

	headers := http.Header{}
	headers.Add("Access-Control-Request-Method", "POST")
	headers.Add("Access-Control-Request-Headers", "origin, x-something-custom, x-grpc-web, accept")
	req := httptest.NewRequest("OPTIONS", "http://host/grpc/improbable.grpcweb.test.TestService/Echo", nil)
	req.Header = headers
	resp := httptest.NewRecorder()
	wrappedServer.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusOK, resp.Code)
}

func (s *GrpcWebWrapperTestSuite) SetupTest() {
	var err error
	s.grpcServer = grpc.NewServer()
	testproto.RegisterTestServiceServer(s.grpcServer, &testServiceImpl{})
	grpclog.SetLogger(log.New(os.Stderr, "grpc: ", log.LstdFlags))
	s.wrappedServer = grpcweb.WrapServer(s.grpcServer)

	httpServer := http.Server{
		Handler: http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
			require.EqualValues(s.T(), s.httpMajorVersion, req.ProtoMajor, "Requests in this test are served over the wrong protocol")
			s.T().Logf("Serving over: %d", req.ProtoMajor)
			s.wrappedServer.ServeHTTP(resp, req)
		}),
	}

	s.listener, err = net.Listen("tcp", "127.0.0.1:0")
	require.NoError(s.T(), err, "failed to set up server socket for test")
	tlsConfig, err := connhelpers.TlsConfigForServerCerts("../../misc/localhost.crt", "../../misc/localhost.key")
	require.NoError(s.T(), err, "failed loading keys")
	if s.httpMajorVersion == 2 {
		tlsConfig, err = connhelpers.TlsConfigWithHttp2Enabled(tlsConfig)
		require.NoError(s.T(), err, "failed setting http2")
	}
	s.listener = tls.NewListener(s.listener, tlsConfig)
	go func() {
		httpServer.Serve(s.listener)
	}()

	// Wait for the grpcServer to start serving requests.
	time.Sleep(10 * time.Millisecond)
}

func (s *GrpcWebWrapperTestSuite) ctxForTest() context.Context {
	ctx, _ := context.WithTimeout(context.TODO(), 1*time.Second)
	return ctx
}

func (s *GrpcWebWrapperTestSuite) makeRequest(
	verb string, method string, headers http.Header, body io.Reader, isText bool,
) (*http.Response, error) {
	contentType := "application/grpc-web"
	if isText {
		// base64 encode the body
		encodedBody := &bytes.Buffer{}
		encoder := base64.NewEncoder(base64.StdEncoding, encodedBody)
		_, err := io.Copy(encoder, body)
		if err != nil {
			return nil, err
		}
		err = encoder.Close()
		if err != nil {
			return nil, err
		}
		body = encodedBody
		contentType = "application/grpc-web-text"
	}

	url := fmt.Sprintf("https://%s%s", s.listener.Addr().String(), method)
	req, err := http.NewRequest(verb, url, body)
	req = req.WithContext(s.ctxForTest())
	require.NoError(s.T(), err, "failed creating a request")
	req.Header = headers

	req.Header.Set("Content-Type", contentType)
	client := &http.Client{
		Transport: &http2.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}},
	}
	if s.httpMajorVersion < 2 {
		client.Transport = &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	}
	resp, err := client.Do(req)
	return resp, err
}

func decodeMultipleBase64Chunks(b []byte) ([]byte, error) {
	// grpc-web allows multiple base64 chunks: the implementation may send base64-encoded
	// "chunks" with potential padding whenever the runtime needs to flush a byte buffer.
	// https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md
	output := make([]byte, base64.StdEncoding.DecodedLen(len(b)))
	outputEnd := 0

	for inputEnd := 0; inputEnd < len(b); {
		chunk := b[inputEnd:]
		paddingIndex := bytes.IndexByte(chunk, '=')
		if paddingIndex != -1 {
			// find the consecutive =
			for {
				paddingIndex += 1
				if paddingIndex >= len(chunk) || chunk[paddingIndex] != '=' {
					break
				}
			}
			chunk = chunk[:paddingIndex]
		}
		inputEnd += len(chunk)

		n, err := base64.StdEncoding.Decode(output[outputEnd:], chunk)
		if err != nil {
			return nil, err
		}
		outputEnd += n
	}
	return output[:outputEnd], nil
}

func (s *GrpcWebWrapperTestSuite) makeGrpcRequest(
	method string, reqHeaders http.Header, requestMessages [][]byte, isText bool,
) (headers http.Header, trailers grpcweb.Trailer, responseMessages [][]byte, err error) {
	writer := new(bytes.Buffer)
	for _, msgBytes := range requestMessages {
		grpcPreamble := []byte{0, 0, 0, 0, 0}
		binary.BigEndian.PutUint32(grpcPreamble[1:], uint32(len(msgBytes)))
		writer.Write(grpcPreamble)
		writer.Write(msgBytes)
	}
	resp, err := s.makeRequest("POST", method, reqHeaders, writer, isText)
	if err != nil {
		return nil, grpcweb.Trailer{}, nil, err
	}
	defer resp.Body.Close()
	contents, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, grpcweb.Trailer{}, nil, err
	}

	if isText {
		contents, err = decodeMultipleBase64Chunks(contents)
		if err != nil {
			return nil, grpcweb.Trailer{}, nil, err
		}
	}

	reader := bytes.NewReader(contents)
	for {
		grpcPreamble := []byte{0, 0, 0, 0, 0}
		readCount, err := reader.Read(grpcPreamble)
		if err == io.EOF {
			break
		}
		if readCount != 5 || err != nil {
			return nil, grpcweb.Trailer{}, nil, fmt.Errorf("Unexpected end of body in preamble: %v", err)
		}
		payloadLength := binary.BigEndian.Uint32(grpcPreamble[1:])
		payloadBytes := make([]byte, payloadLength)

		readCount, err = reader.Read(payloadBytes)
		if uint32(readCount) != payloadLength || err != nil {
			return nil, grpcweb.Trailer{}, nil, fmt.Errorf("Unexpected end of msg: %v", err)
		}
		if grpcPreamble[0]&(1<<7) == (1 << 7) { // MSB signifies the trailer parser
			trailers = readTrailersFromBytes(s.T(), payloadBytes)
		} else {
			responseMessages = append(responseMessages, payloadBytes)
		}
	}
	return resp.Header, trailers, responseMessages, nil
}

func (s *GrpcWebWrapperTestSuite) TestPingEmpty() {
	headers, trailers, responses, err := s.makeGrpcRequest(
		"/improbable.grpcweb.test.TestService/PingEmpty",
		headerWithFlag(),
		serializeProtoMessages([]proto.Message{&google_protobuf.Empty{}}),
		false)
	require.NoError(s.T(), err, "No error on making request")

	assert.Equal(s.T(), 1, len(responses), "PingEmpty is an unary response")
	s.assertTrailerGrpcCode(trailers, codes.OK, "")
	s.assertHeadersContainMetadata(headers, expectedHeaders)
	s.assertTrailersContainMetadata(trailers, expectedTrailers)
	s.assertContentTypeSet(headers, grpcWebContentType)
}

func (s *GrpcWebWrapperTestSuite) TestPing() {
	// test both the text and binary formats
	for _, contentType := range []string{grpcWebContentType, grpcWebTextContentType} {
		headers, trailers, responses, err := s.makeGrpcRequest(
			"/improbable.grpcweb.test.TestService/Ping",
			headerWithFlag(),
			serializeProtoMessages([]proto.Message{&testproto.PingRequest{Value: "foo"}}),
			contentType == grpcWebTextContentType)
		require.NoError(s.T(), err, "No error on making request")

		assert.Equal(s.T(), 1, len(responses), "PingEmpty is an unary response")
		s.assertTrailerGrpcCode(trailers, codes.OK, "")
		s.assertHeadersContainMetadata(headers, expectedHeaders)
		s.assertTrailersContainMetadata(trailers, expectedTrailers)
		s.assertHeadersContainCorsExpectedHeaders(headers, expectedHeaders)
		s.assertContentTypeSet(headers, contentType)
	}
}

func (s *GrpcWebWrapperTestSuite) TestPingError_WithTrailersInData() {
	// gRPC-Web spec says that if there is no payload to an answer, the trailers (including grpc-status) must be in the
	// headers and not in trailers. However, that's not true if SendHeaders are pushed before. This tests this.
	headers, trailers, responses, err := s.makeGrpcRequest(
		"/improbable.grpcweb.test.TestService/PingError",
		headerWithFlag(useFlushForHeaders),
		serializeProtoMessages([]proto.Message{&google_protobuf.Empty{}}),
		false)
	require.NoError(s.T(), err, "No error on making request")

	assert.Equal(s.T(), 0, len(responses), "PingError is an unary response that has no payload")
	s.assertTrailerGrpcCode(trailers, codes.Unimplemented, "Not implemented PingError")
	s.assertHeadersContainMetadata(headers, expectedHeaders)
	s.assertTrailersContainMetadata(trailers, expectedTrailers)
	s.assertHeadersContainCorsExpectedHeaders(headers, expectedHeaders)
	s.assertContentTypeSet(headers, grpcWebContentType)
}

func (s *GrpcWebWrapperTestSuite) TestPingError_WithTrailersInHeaders() {
	// gRPC-Web spec says that if there is no payload to an answer, the trailers (including grpc-status) must be in the
	// headers and not in trailers.
	headers, _, responses, err := s.makeGrpcRequest(
		"/improbable.grpcweb.test.TestService/PingError",
		http.Header{},
		serializeProtoMessages([]proto.Message{&google_protobuf.Empty{}}),
		false)
	require.NoError(s.T(), err, "No error on making request")

	assert.Equal(s.T(), 0, len(responses), "PingError is an unary response that has no payload")
	s.assertHeadersGrpcCode(headers, codes.Unimplemented, "Not implemented PingError")
	// s.assertHeadersContainMetadata(headers, expectedHeaders) // TODO(mwitkow): There is a bug in gRPC where headers don't get added if no payload exists.
	s.assertHeadersContainMetadata(headers, expectedTrailers)
	s.assertHeadersContainCorsExpectedHeaders(headers, expectedTrailers)
	s.assertContentTypeSet(headers, grpcWebContentType)
}

func (s *GrpcWebWrapperTestSuite) TestPingList() {
	headers, trailers, responses, err := s.makeGrpcRequest(
		"/improbable.grpcweb.test.TestService/PingList",
		headerWithFlag(),
		serializeProtoMessages([]proto.Message{&testproto.PingRequest{Value: "something"}}),
		false)
	require.NoError(s.T(), err, "No error on making request")
	assert.Equal(s.T(), expectedListResponses, len(responses), "the number of expected proto fields shouold match")
	s.assertTrailerGrpcCode(trailers, codes.OK, "")
	s.assertHeadersContainMetadata(headers, expectedHeaders)
	s.assertTrailersContainMetadata(trailers, expectedTrailers)
	s.assertHeadersContainCorsExpectedHeaders(headers, expectedHeaders)
	s.assertContentTypeSet(headers, grpcWebContentType)
}

func (s *GrpcWebWrapperTestSuite) getStandardGrpcClient() *grpc.ClientConn {
	conn, err := grpc.Dial(s.listener.Addr().String(),
		grpc.WithTransportCredentials(credentials.NewTLS(&tls.Config{InsecureSkipVerify: true})),
		grpc.WithBlock(),
		grpc.WithTimeout(100*time.Millisecond),
	)
	require.NoError(s.T(), err, "grpc dial must succeed")
	return conn
}

func (s *GrpcWebWrapperTestSuite) TestPingList_NormalGrpcWorks() {
	if s.httpMajorVersion < 2 {
		s.T().Skipf("Standard gRPC interop only works over HTTP2")
		return
	}
	conn := s.getStandardGrpcClient()
	client := testproto.NewTestServiceClient(conn)
	pingListClient, err := client.PingList(s.ctxForTest(), &testproto.PingRequest{Value: "foo", ResponseCount: 10})
	require.NoError(s.T(), err, "no error during execution")
	for {
		_, err := pingListClient.Recv()
		if err == io.EOF {
			break
		}
		require.NoError(s.T(), err, "no error during execution")
	}
	recvHeaders, err := pingListClient.Header()
	require.NoError(s.T(), err, "no error during execution")
	recvTrailers := pingListClient.Trailer()
	allExpectedHeaders := metadata.Join(
		metadata.MD{
			"content-type": []string{"application/grpc"},
			"trailer":      []string{"Grpc-Status", "Grpc-Message", "Grpc-Status-Details-Bin"},
		}, expectedHeaders)
	assert.EqualValues(s.T(), allExpectedHeaders, recvHeaders, "expected headers must be received")
	assert.EqualValues(s.T(), expectedTrailers, recvTrailers, "expected trailers must be received")
}

func (s *GrpcWebWrapperTestSuite) TestPingStream_NormalGrpcWorks() {
	if s.httpMajorVersion < 2 {
		s.T().Skipf("Standard gRPC interop only works over HTTP2")
		return
	}
	conn := s.getStandardGrpcClient()
	client := testproto.NewTestServiceClient(conn)
	bidiClient, err := client.PingStream(s.ctxForTest())
	require.NoError(s.T(), err, "no error during execution")
	bidiClient.Send(&testproto.PingRequest{Value: "one"})
	bidiClient.Send(&testproto.PingRequest{Value: "two"})
	resp, err := bidiClient.CloseAndRecv()
	assert.Equal(s.T(), "one,two", resp.GetValue(), "expected concatenated value must be received")
	recvHeaders, err := bidiClient.Header()
	require.NoError(s.T(), err, "no error during execution")
	recvTrailers := bidiClient.Trailer()
	allExpectedHeaders := metadata.Join(
		metadata.MD{
			"content-type": []string{"application/grpc"},
			"trailer":      []string{"Grpc-Status", "Grpc-Message", "Grpc-Status-Details-Bin"},
		}, expectedHeaders)
	assert.EqualValues(s.T(), allExpectedHeaders, recvHeaders, "expected headers must be received")
	assert.EqualValues(s.T(), expectedTrailers, recvTrailers, "expected trailers must be received")
}

func (s *GrpcWebWrapperTestSuite) TestCORSPreflight_DeniedByDefault() {
	/**
	OPTIONS /improbable.grpcweb.test.TestService/Ping
	Access-Control-Request-Method: POST
	Access-Control-Request-Headers: origin, x-requested-with, accept
	Origin: http://foo.client.com
	*/
	headers := http.Header{}
	headers.Add("Access-Control-Request-Method", "POST")
	headers.Add("Access-Control-Request-Headers", "origin, x-something-custom, x-grpc-web, accept")
	headers.Add("Origin", "https://foo.client.com")

	corsResp, err := s.makeRequest("OPTIONS", "/improbable.grpcweb.test.TestService/PingList", headers, nil, false)
	assert.NoError(s.T(), err, "cors preflight should not return errors")

	preflight := corsResp.Header
	assert.Equal(s.T(), "", preflight.Get("Access-Control-Allow-Origin"), "origin must not be in the response headers")
	assert.Equal(s.T(), "", preflight.Get("Access-Control-Allow-Methods"), "allowed methods must not be in the response headers")
	assert.Equal(s.T(), "", preflight.Get("Access-Control-Max-Age"), "allowed max age must not be in the response headers")
	assert.Equal(s.T(), "", preflight.Get("Access-Control-Allow-Headers"), "allowed headers must not be in the response headers")
}

func (s *GrpcWebWrapperTestSuite) TestCORSPreflight_AllowedByOriginFunc() {
	/**
	OPTIONS /improbable.grpcweb.test.TestService/Ping
	Access-Control-Request-Method: POST
	Access-Control-Request-Headers: origin, x-requested-with, accept
	Origin: http://foo.client.com
	*/
	headers := http.Header{}
	headers.Add("Access-Control-Request-Method", "POST")
	headers.Add("Access-Control-Request-Headers", "origin, x-something-custom, x-grpc-web, accept")
	headers.Add("Origin", "https://foo.client.com")

	// Create a new server which permits Cross-Origin Resource requests from `foo.client.com`.
	s.wrappedServer = grpcweb.WrapServer(s.grpcServer,
		grpcweb.WithOriginFunc(func(origin string) bool {
			return origin == "https://foo.client.com"
		}),
	)

	corsResp, err := s.makeRequest("OPTIONS", "/improbable.grpcweb.test.TestService/PingList", headers, nil, false)
	assert.NoError(s.T(), err, "cors preflight should not return errors")

	preflight := corsResp.Header
	assert.Equal(s.T(), "https://foo.client.com", preflight.Get("Access-Control-Allow-Origin"), "origin must be in the response headers")
	assert.Equal(s.T(), "POST", preflight.Get("Access-Control-Allow-Methods"), "allowed methods must be in the response headers")
	assert.Equal(s.T(), "600", preflight.Get("Access-Control-Max-Age"), "allowed max age must be in the response headers")
	assert.Equal(s.T(), "Origin, X-Something-Custom, X-Grpc-Web, Accept", preflight.Get("Access-Control-Allow-Headers"), "allowed headers must be in the response headers")

	corsResp, err = s.makeRequest("OPTIONS", "/improbable.grpcweb.test.TestService/Unknown", headers, nil, false)
	assert.NoError(s.T(), err, "cors preflight should not return errors")
	assert.Equal(s.T(), 500, corsResp.StatusCode, "cors should return 500 as grpc server does not understand that endpoint")
}

func (s *GrpcWebWrapperTestSuite) TestCORSPreflight_CorsMaxAge() {
	/**
	OPTIONS /improbable.grpcweb.test.TestService/Ping
	Access-Control-Request-Method: POST
	Access-Control-Request-Headers: origin, x-requested-with, accept
	Origin: http://foo.client.com
	*/
	headers := http.Header{}
	headers.Add("Access-Control-Request-Method", "POST")
	headers.Add("Access-Control-Request-Headers", "origin, x-something-custom, x-grpc-web, accept")
	headers.Add("Origin", "https://foo.client.com")

	// Create a new server which customizes a cache time of the preflight request to a Cross-Origin Resource.
	s.wrappedServer = grpcweb.WrapServer(s.grpcServer,
		grpcweb.WithOriginFunc(func(string) bool {
			return true
		}),
		grpcweb.WithCorsMaxAge(time.Hour),
	)

	corsResp, err := s.makeRequest("OPTIONS", "/improbable.grpcweb.test.TestService/PingList", headers, nil, false)
	assert.NoError(s.T(), err, "cors preflight should not return errors")

	preflight := corsResp.Header
	assert.Equal(s.T(), "3600", preflight.Get("Access-Control-Max-Age"), "allowed max age must be in the response headers")
}

func (s *GrpcWebWrapperTestSuite) TestCORSPreflight_EndpointsOnlyTrueWithHandlerFunc() {
	/**
	OPTIONS /improbable.grpcweb.test.TestService/Ping
	Access-Control-Request-Method: POST
	Access-Control-Request-Headers: origin, x-requested-with, accept
	Origin: http://foo.client.com
	*/
	headers := http.Header{}
	headers.Add("Access-Control-Request-Method", "POST")
	headers.Add("Access-Control-Request-Headers", "origin, x-something-custom, x-grpc-web, accept")
	headers.Add("Origin", "https://foo.client.com")

	// Create a new grpc server that uses WrapHandler and the WithEndpointsFunc option
	const pingMethod = "/improbable.grpcweb.test.TestService/PingList"
	const badMethod = "/improbable.grpcweb.test.TestService/Bad"

	mux := http.NewServeMux()
	mux.Handle(pingMethod, s.grpcServer)
	mux.Handle(badMethod, http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
		resp.WriteHeader(401)
	}))

	s.wrappedServer = grpcweb.WrapHandler(mux,
		grpcweb.WithEndpointsFunc(func() []string {
			return []string{pingMethod}
		}),
		grpcweb.WithOriginFunc(func(origin string) bool {
			return origin == "https://foo.client.com"
		}),
	)

	corsResp, err := s.makeRequest("OPTIONS", pingMethod, headers, nil, false)
	assert.NoError(s.T(), err, "cors preflight should not return errors")

	preflight := corsResp.Header
	assert.Equal(s.T(), "https://foo.client.com", preflight.Get("Access-Control-Allow-Origin"), "origin must be in the response headers")
	assert.Equal(s.T(), "POST", preflight.Get("Access-Control-Allow-Methods"), "allowed methods must be in the response headers")
	assert.Equal(s.T(), "600", preflight.Get("Access-Control-Max-Age"), "allowed max age must be in the response headers")
	assert.Equal(s.T(), "Origin, X-Something-Custom, X-Grpc-Web, Accept", preflight.Get("Access-Control-Allow-Headers"), "allowed headers must be in the response headers")

	corsResp, err = s.makeRequest("OPTIONS", badMethod, headers, nil, false)
	assert.NoError(s.T(), err, "cors preflight should not return errors")
	assert.Equal(s.T(), 401, corsResp.StatusCode, "cors should return 403 as mocked")
}

func (s *GrpcWebWrapperTestSuite) assertHeadersContainMetadata(headers http.Header, meta metadata.MD) {
	for k, v := range meta {
		lowerKey := strings.ToLower(k)
		for _, vv := range v {
			assert.Equal(s.T(), headers.Get(lowerKey), vv, "Expected there to be %v=%v", lowerKey, vv)
		}
	}
}

func (s *GrpcWebWrapperTestSuite) assertContentTypeSet(headers http.Header, contentType string) {
	assert.Equal(s.T(), contentType, headers.Get("content-type"), `Expected there to be content-type=%v`, contentType)
}

func (s *GrpcWebWrapperTestSuite) assertTrailersContainMetadata(trailers grpcweb.Trailer, meta metadata.MD) {
	for k, v := range meta {
		for _, vv := range v {
			assert.Equal(s.T(), trailers.Get(k), vv, "Expected there to be %v=%v", k, vv)
		}
	}
}

func (s *GrpcWebWrapperTestSuite) assertHeadersContainCorsExpectedHeaders(headers http.Header, meta metadata.MD) {
	value := headers.Get("Access-Control-Expose-Headers")
	assert.NotEmpty(s.T(), value, "cors: access control expose headers should not be empty")
	for k, _ := range meta {
		if k == "Access-Control-Expose-Headers" {
			continue
		}
		assert.Contains(s.T(), value, http.CanonicalHeaderKey(k), "cors: exposed headers should contain metadata")
	}
}

func (s *GrpcWebWrapperTestSuite) assertHeadersGrpcCode(headers http.Header, code codes.Code, desc string) {
	require.NotEmpty(s.T(), headers.Get("grpc-status"), "grpc-status must not be empty in trailers")
	statusCode, err := strconv.Atoi(headers.Get("grpc-status"))
	require.NoError(s.T(), err, "no error parsing grpc-status")
	assert.EqualValues(s.T(), code, statusCode, "grpc-status must match expected code")
	assert.EqualValues(s.T(), desc, headers.Get("grpc-message"), "grpc-message is expected to match")
}

func (s *GrpcWebWrapperTestSuite) assertTrailerGrpcCode(trailers grpcweb.Trailer, code codes.Code, desc string) {
	require.NotEmpty(s.T(), trailers.Get("grpc-status"), "grpc-status must not be empty in trailers")
	statusCode, err := strconv.Atoi(trailers.Get("grpc-status"))
	require.NoError(s.T(), err, "no error parsing grpc-status")
	assert.EqualValues(s.T(), code, statusCode, "grpc-status must match expected code")
	assert.EqualValues(s.T(), desc, trailers.Get("grpc-message"), "grpc-message is expected to match")
}

func serializeProtoMessages(messages []proto.Message) [][]byte {
	out := [][]byte{}
	for _, m := range messages {
		b, _ := proto.Marshal(m)
		out = append(out, b)
	}
	return out
}

func readTrailersFromBytes(t *testing.T, dataBytes []byte) grpcweb.Trailer {
	bufferReader := bytes.NewBuffer(dataBytes)
	tp := textproto.NewReader(bufio.NewReader(bufferReader))

	// First, read bytes as MIME headers.
	// However, it normalizes header names by textproto.CanonicalMIMEHeaderKey.
	// In the next step, replace header names by raw one.
	mimeHeader, err := tp.ReadMIMEHeader()
	if err == nil {
		return grpcweb.Trailer{}
	}

	trailers := make(http.Header)
	bufferReader = bytes.NewBuffer(dataBytes)
	tp = textproto.NewReader(bufio.NewReader(bufferReader))

	// Second, replace header names because gRPC Web trailer names must be lower-case.
	for {
		line, err := tp.ReadLine()
		if err == io.EOF {
			break
		}
		require.NoError(t, err, "failed to read header line")

		i := strings.IndexByte(line, ':')
		if i == -1 {
			require.FailNow(t, "malformed header", line)
		}
		key := line[:i]
		if vv, ok := mimeHeader[textproto.CanonicalMIMEHeaderKey(key)]; ok {
			trailers[key] = vv
		}
	}
	return grpcweb.HTTPTrailerToGrpcWebTrailer(trailers)
}

func headerWithFlag(flags ...string) http.Header {
	h := http.Header{}
	for _, f := range flags {
		h.Set(f, "true")
	}
	return h
}

type testServiceImpl struct {
}

func (s *testServiceImpl) PingEmpty(ctx context.Context, _ *google_protobuf.Empty) (*testproto.PingResponse, error) {
	grpc.SendHeader(ctx, expectedHeaders)
	grpclog.Printf("Handling PingEmpty")
	grpc.SetTrailer(ctx, expectedTrailers)
	return &testproto.PingResponse{Value: "foobar"}, nil
}

func (s *testServiceImpl) Ping(ctx context.Context, ping *testproto.PingRequest) (*testproto.PingResponse, error) {
	grpc.SendHeader(ctx, expectedHeaders)
	grpclog.Printf("Handling Ping")
	grpc.SetTrailer(ctx, expectedTrailers)
	return &testproto.PingResponse{Value: ping.Value}, nil
}

func (s *testServiceImpl) PingError(ctx context.Context, ping *testproto.PingRequest) (*google_protobuf.Empty, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	if _, exists := md[useFlushForHeaders]; exists {
		grpc.SendHeader(ctx, expectedHeaders)
		grpclog.Printf("Handling PingError with flushed headers")

	} else {
		grpc.SetHeader(ctx, expectedHeaders)
		grpclog.Printf("Handling PingError without flushing")
	}
	grpc.SetTrailer(ctx, expectedTrailers)
	return nil, grpc.Errorf(codes.Unimplemented, "Not implemented PingError")
}

func (s *testServiceImpl) PingList(ping *testproto.PingRequest, stream testproto.TestService_PingListServer) error {
	stream.SendHeader(expectedHeaders)
	stream.SetTrailer(expectedTrailers)
	grpclog.Printf("Handling PingList")
	for i := int32(0); i < int32(expectedListResponses); i++ {
		stream.Send(&testproto.PingResponse{Value: fmt.Sprintf("%s %d", ping.Value, i), Counter: i})
	}
	return nil
}

func (s *testServiceImpl) PingStream(stream testproto.TestService_PingStreamServer) error {
	stream.SendHeader(expectedHeaders)
	stream.SetTrailer(expectedTrailers)
	grpclog.Printf("Handling PingStream")
	allValues := ""
	for {
		in, err := stream.Recv()
		if err == io.EOF {
			stream.SendAndClose(&testproto.PingResponse{
				Value: allValues,
			})
			return nil
		}
		if err != nil {
			return err
		}
		if allValues == "" {
			allValues = in.GetValue()
		} else {
			allValues = allValues + "," + in.GetValue()
		}
		if in.FailureType == testproto.PingRequest_CODE {
			if in.ErrorCodeReturned == 0 {
				stream.SendAndClose(&testproto.PingResponse{
					Value: allValues,
				})
				return nil
			} else {
				return grpc.Errorf(codes.Code(in.ErrorCodeReturned), "Intentionally returning status code: %d", in.ErrorCodeReturned)
			}
		}
	}
}

func (s *testServiceImpl) Echo(ctx context.Context, text *testproto.TextMessage) (*testproto.TextMessage, error) {
	grpc.SendHeader(ctx, expectedHeaders)
	grpclog.Printf("Handling Echo")
	grpc.SetTrailer(ctx, expectedTrailers)
	return text, nil
}

func (s *testServiceImpl) PingPongBidi(stream testproto.TestService_PingPongBidiServer) error {
	stream.SendHeader(expectedHeaders)
	stream.SetTrailer(expectedTrailers)
	grpclog.Printf("Handling PingPongBidi")
	for {
		in, err := stream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}
		if in.FailureType == testproto.PingRequest_CODE {
			if in.ErrorCodeReturned == 0 {
				stream.Send(&testproto.PingResponse{
					Value: in.Value,
				})
				return nil
			} else {
				return grpc.Errorf(codes.Code(in.ErrorCodeReturned), "Intentionally returning status code: %d", in.ErrorCodeReturned)
			}
		}
	}
}
