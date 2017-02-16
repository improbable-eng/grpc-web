package grpc_browser_compat_test

import (
	"net"
	"net/http"
	"testing"

	testproto "github.com/mwitkow/grpc-browser-compat/cmd/testproto"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"

	"bytes"
	"context"
	"crypto/tls"
	"encoding/binary"
	"fmt"
	"io"
	"log"
	"os"
	"time"

	"github.com/mwitkow/go-conntrack/connhelpers"
	"golang.org/x/net/http2"
	"google.golang.org/grpc"
	"google.golang.org/grpc/grpclog"

	"io/ioutil"

	"github.com/golang/protobuf/proto"
)

type MiddlewareTestSuite struct {
	suite.Suite
	http1Listener net.Listener
	http2Listener net.Listener
	serverHttp    http.Server
}

func TestMiddlewareTestSuite(t *testing.T) {
	suite.Run(t, new(MiddlewareTestSuite))
}

func (s *MiddlewareTestSuite) buildTlsListener(withHttp2 bool) net.Listener {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(s.T(), err, "must be able to allocate a port for listener")

	tlsConfig, err := connhelpers.TlsConfigForServerCerts("misc/localhost.crt", "misc/localhost.key")
	if err != nil {
		log.Fatalf("Failed configuring TLS: %v", err)
	}
	if withHttp2 {
		tlsConfig, err = connhelpers.TlsConfigWithHttp2Enabled(tlsConfig)
		if err != nil {
			log.Fatalf("Failed configuring TLS: %v", err)
		}
	}
	return tls.NewListener(listener, tlsConfig)
}

func (s *MiddlewareTestSuite) SetupSuite() {
	s.http1Listener = s.buildTlsListener(false)
	s.http2Listener = s.buildTlsListener(true)

	grpcServer := grpc.NewServer()
	testproto.RegisterTestServiceServer(grpcServer, &testproto.TestServiceImpl{})
	grpclog.SetLogger(log.New(os.Stderr, "grpc: ", log.LstdFlags))
	s.serverHttp = http.Server{
		Handler: http.HandlerFunc(func(resp http.ResponseWriter, req *http.Request) {
			s.T().Logf("Serving REquest: %v", req)
			grpcServer.ServeHTTP(resp, req)
			//resp.WriteHeader(http.StatusOK)
		}),
	}
	s.serverHttp.Addr = ":9999"

	//go func() {
	//	s.T().Logf("Listening for HTTP1 on %v", s.http1Listener.Addr().String())
	//	s.serverHttp.Serve(s.http1Listener)
	//}()
	go func() {
		err := s.serverHttp.ListenAndServeTLS("misc/localhost.crt", "misc/localhost.key")
		require.NoError(s.T(), err, "failed to start HTTPS server")
		//s.T().Logf("Listening for HTTP2 on %v", s.http2Listener.Addr().String())
		//s.serverHttp.Serve(s.http2Listener)
	}()
	time.Sleep(10 * time.Millisecond)
}

func (s *MiddlewareTestSuite) ctxForTest() context.Context {
	ctx, _ := context.WithTimeout(context.TODO(), 1*time.Second)
	return ctx
}

func (s *MiddlewareTestSuite) makeRequest(useHttp2 bool, method string, body io.Reader) (*http.Response, error) {
	req, err := http.NewRequest("POST", fmt.Sprintf("https://localhost:9999%s", method), body)
	req = req.WithContext(s.ctxForTest())
	require.NoError(s.T(), err, "failed creating a request")
	req.Header.Set("Content-Type", "application/grpc")
	client := &http.Client{
		Transport: &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}},
	}
	if useHttp2 {
		client = &http.Client{
			// InsecureTLSDial is temporary and will likely be
			// replaced by a different API later.
			Transport: &http2.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}},
		}
	}
	resp, err := client.Do(req)
	return resp, err
}

func (s *MiddlewareTestSuite) makeGrpcRequest(useHttp2 bool, method string, requestMessages [][]byte) (headers http.Header, trailers http.Header, responseMessages [][]byte, err error) {
	writer := new(bytes.Buffer)
	for _, msgBytes := range requestMessages {
		grpcPreamble := []byte{0, 0, 0, 0, 0}
		binary.BigEndian.PutUint32(grpcPreamble[1:], uint32(len(msgBytes)))
		writer.Write(grpcPreamble)
		writer.Write(msgBytes)
	}
	s.T().Logf("This is the writer lenght: %d", writer.Len())
	resp, err := s.makeRequest(useHttp2, method, writer)
	if err != nil {
		return nil, nil, nil, err
	}
	defer resp.Body.Close()
	contents, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, nil, err
	}
	reader := bytes.NewReader(contents)

	for {
		grpcPreamble := []byte{0, 0, 0, 0, 0}
		readCount, err := reader.Read(grpcPreamble)
		if err == io.EOF {
			break
		}
		if readCount != 5 || err != nil {
			return nil, nil, nil, fmt.Errorf("Unexpected end of body in preamble: %v", err)
		}
		msgLength := binary.BigEndian.Uint32(grpcPreamble[1:])
		msgBytes := make([]byte, msgLength)
		readCount, err = reader.Read(msgBytes)
		if uint32(readCount) != msgLength || err != nil {
			return nil, nil, nil, fmt.Errorf("Unexpected end of msg: %v", err)
		}
		responseMessages = append(responseMessages, msgBytes)
	}
	s.T().Logf("Got %d msg", len(responseMessages))
	return resp.Header, http.Header{}, responseMessages, nil

}

func (s *MiddlewareTestSuite) SetupTest() {
}

func (s *MiddlewareTestSuite) TestPingEmpty() {
	headers, trailers, responses, err := s.makeGrpcRequest(
		true,
		"/mwitkow.testproto.TestService/PingEmpty",
		serializeProtoMessages([]proto.Message{&testproto.Empty{}}))
	require.NoError(s.T(), err, "No error on making request")
	//require.Equal(s.T(), http.StatusPermanentRedirect, resp.StatusCode)
	s.T().Logf("YOLO: %v", err)
	s.T().Logf("HEADERS: %v TRAILERS: %v RESPONSES_LEN: %v", headers, trailers, len(responses))

}


func (s *MiddlewareTestSuite) TestPingList() {
	headers, trailers, responses, err := s.makeGrpcRequest(
		true,
		"/mwitkow.testproto.TestService/PingList",
		serializeProtoMessages([]proto.Message{&testproto.PingRequest{Value: "something"}}))
	require.NoError(s.T(), err, "No error on making request")
	//require.Equal(s.T(), http.StatusPermanentRedirect, resp.StatusCode)
	s.T().Logf("YOLO: %v", err)
	s.T().Logf("HEADERS: %v TRAILERS: %v RESPONSES_LEN: %v", headers, trailers, len(responses))

}

func (s *MiddlewareTestSuite) TearDownTest() {
}

func (s *MiddlewareTestSuite) TearDownSuite() {
	s.http1Listener.Close()
	s.http2Listener.Close()
}

func serializeProtoMessages(messages []proto.Message) [][]byte {
	out := [][]byte{}
	for _, m := range messages {
		b, _ := proto.Marshal(m)
		out = append(out, b)
	}
	return out
}
