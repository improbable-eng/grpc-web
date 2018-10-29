package grpcweb

import (
	"io"
	"net/http"
	"net/http/httptrace"
	"net/textproto"
	"sort"
	"strings"
	"sync"
)

// Almost of header's methods are copied from http.Header.
type header struct {
	http.Header
}

func (h header) Add(key, value string) {
	lowerKey := strings.ToLower(key)

	// If trailer headers, map to lower these keys.
	if lowerKey == "trailer" {
		value = strings.ToLower(value)
	}
	h.Header[lowerKey] = append(h.Header[lowerKey], value)
}

func (h header) toHTTPHeader() http.Header {
	return h.Header
}

// Write writes a header in wire format.
func (h header) Write(w io.Writer) error {
	return h.write(w, nil)
}

func (h header) write(w io.Writer, trace *httptrace.ClientTrace) error {
	return h.writeSubset(w, nil, trace)
}

func (h header) clone() header {
	h2 := header{make(http.Header, len(h.Header))}
	for k, vv := range h.Header {
		vv2 := make([]string, len(vv))
		copy(vv2, vv)
		h2.Header[k] = vv2
	}
	return h2
}

var headerNewlineToSpace = strings.NewReplacer("\n", " ", "\r", " ")

type writeStringer interface {
	WriteString(string) (int, error)
}

// stringWriter implements WriteString on a Writer.
type stringWriter struct {
	w io.Writer
}

func (w stringWriter) WriteString(s string) (n int, err error) {
	return w.w.Write([]byte(s))
}

type keyValues struct {
	key    string
	values []string
}

// A headerSorter implements sort.Interface by sorting a []keyValues
// by key. It's used as a pointer, so it can fit in a sort.Interface
// interface value without allocation.
type headerSorter struct {
	kvs []keyValues
}

func (s *headerSorter) Len() int           { return len(s.kvs) }
func (s *headerSorter) Swap(i, j int)      { s.kvs[i], s.kvs[j] = s.kvs[j], s.kvs[i] }
func (s *headerSorter) Less(i, j int) bool { return s.kvs[i].key < s.kvs[j].key }

var headerSorterPool = sync.Pool{
	New: func() interface{} { return new(headerSorter) },
}

// sortedKeyValues returns h's keys sorted in the returned kvs
// slice. The headerSorter used to sort is also returned, for possible
// return to headerSorterCache.
func (h header) sortedKeyValues(exclude map[string]bool) (kvs []keyValues, hs *headerSorter) {
	hs = headerSorterPool.Get().(*headerSorter)
	if cap(hs.kvs) < len(h.Header) {
		hs.kvs = make([]keyValues, 0, len(h.Header))
	}
	kvs = hs.kvs[:0]
	for k, vv := range h.Header {
		if !exclude[k] {
			kvs = append(kvs, keyValues{k, vv})
		}
	}
	hs.kvs = kvs
	sort.Sort(hs)
	return kvs, hs
}

func (h header) writeSubset(w io.Writer, exclude map[string]bool, trace *httptrace.ClientTrace) error {
	ws, ok := w.(writeStringer)
	if !ok {
		ws = stringWriter{w}
	}
	kvs, sorter := h.sortedKeyValues(exclude)
	var formattedVals []string
	for _, kv := range kvs {
		for _, v := range kv.values {
			v = headerNewlineToSpace.Replace(v)
			v = textproto.TrimString(v)
			for _, s := range []string{strings.ToLower(kv.key), ": ", v, "\r\n"} {
				if _, err := ws.WriteString(s); err != nil {
					headerSorterPool.Put(sorter)
					return err
				}
			}
			if trace != nil && trace.WroteHeaderField != nil {
				formattedVals = append(formattedVals, v)
			}
		}
		if trace != nil && trace.WroteHeaderField != nil {
			trace.WroteHeaderField(kv.key, formattedVals)
			formattedVals = nil
		}
	}
	headerSorterPool.Put(sorter)
	return nil
}
