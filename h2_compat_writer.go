package grpc_browser_compat

import (
	"encoding/binary"
	"net/http"
	"strconv"
	"strings"

	"github.com/gogo/protobuf/proto"
	"github.com/golang/protobuf/jsonpb"
	"golang.org/x/net/http2"
	"google.golang.org/grpc/grpclog"
)

var (
	grpcBrowserTerminationMarker = []byte{0xD, 0xE, 0xA, 0xD, 0xE, 0x0}

	jsonPbMarshaler = &jsonpb.Marshaler{OrigName: false}
)

type h2CompatResponse struct {
	header  http.Header
	wrapped http.ResponseWriter
}

func newh2CompatResponse(resp http.ResponseWriter) *h2CompatResponse {
	return &h2CompatResponse{header: make(http.Header), wrapped: resp}
}

func (w *h2CompatResponse) Header() http.Header {
	return w.header
}

func (w *h2CompatResponse) Write(b []byte) (int, error) {
	return w.wrapped.Write(b)
}

func (w *h2CompatResponse) WriteHeader(code int) {
	w.copyHeadersToWrapped()
	w.wrapped.Header().Add(hdGrpcCompat, "true")
	w.wrapped.WriteHeader(code)
}

func (w *h2CompatResponse) Flush() {
	w.wrapped.(http.Flusher).Flush()
}

func (w *h2CompatResponse) CloseNotify() <-chan bool {
	return w.wrapped.(http.CloseNotifier).CloseNotify()
}

func (w *h2CompatResponse) copyHeadersToWrapped() {
	wrappedHeader := w.wrapped.Header()
	for k, vv := range w.header {
		for _, v := range vv {
			if k == "Trailer" {
				continue
			}
			wrappedHeader.Add(k, v)
		}
	}
}

func (w *h2CompatResponse) copyTrailersToPayload(req *http.Request) {
	term := w.trailersToTerminator()
	var out []byte
	if strings.Contains(req.Header.Get("Content-Type"), "json") {
		outStr, err := jsonPbMarshaler.MarshalToString(term)
		if err != nil {
			grpclog.Fatalf("Failed jsonpb serializing BrowserTerminator: %v.", err)
		}
		out = []byte(outStr)
	} else {
		var err error
		out, err = proto.Marshal(term)
		if err != nil {
			grpclog.Fatalf("Failed proto serializing BrowserTerminator: %v.", err)
		}
	}

	terminatorPrefix := make([]byte, 5+4)
	copy(terminatorPrefix, grpcBrowserTerminationMarker)
	binary.BigEndian.PutUint32(terminatorPrefix[5:], uint32(len(out)))
	grpclog.Printf("Terminator prefix: %v", terminatorPrefix)
	w.wrapped.(http.Flusher).Flush()
	w.wrapped.Write(terminatorPrefix)
	w.wrapped.Write(out)
	w.wrapped.(http.Flusher).Flush()
}

func (w *h2CompatResponse) trailersToTerminator() *BrowserTerminator {
	statusCode, err := strconv.ParseInt(w.header.Get("Grpc-Status"), 10, 32)
	if err != nil {
		grpclog.Fatalf("Failed parsing into of Grpc-Status")
	}
	term := &BrowserTerminator{
		StatusCode: int32(statusCode),
		StatusDesc: w.header.Get("Grpc-Message"),
	}
	// See the magical docs of TrailerPrefix in http2.
	for k, vv := range w.header {
		for _, v := range vv {
			if !strings.HasPrefix(k, http2.TrailerPrefix) {
				continue
			}
			realName := k[len(http2.TrailerPrefix):]
			term.Trailer = append(term.Trailer, &BrowserTerminator_TrailingHeader{Name: realName, Value: v})
		}
	}
	return term
}
