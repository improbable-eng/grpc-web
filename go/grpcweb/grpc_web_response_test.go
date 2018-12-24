package grpcweb

import (
	"bytes"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"strings"
	"testing"
)

type limitErrorWriter struct {
	dest    io.Writer
	limit   int
	err     error
	current int
}

func (l *limitErrorWriter) Write(source []byte) (int, error) {
	n, err := l.dest.Write(source)
	l.current += n
	if err == nil && l.current >= l.limit {
		err = l.err
	}
	return n, err
}

func TestEncodeBase64Writer(t *testing.T) {
	// Trivial copy
	const input = "some datax"
	output := &bytes.Buffer{}
	base64Writer := encodeBase64Writer(output)
	_, err := io.Copy(base64Writer, strings.NewReader(input))
	if err != nil {
		t.Fatal(err)
	}
	err = base64Writer.Close()
	if err != nil {
		t.Fatal(err)
	}

	expected := base64.StdEncoding.EncodeToString([]byte(input))
	outString := output.String()
	if outString != expected {
		t.Errorf("output:%#v expected:%#v", outString, expected)
	}

	// Error on close on the encoding end should be returned
	// These offsets are set so one error is returned from io.Copy, and the other
	// from base64 Encoder.Close()
	for _, writeErrorOffset := range []int{5, 13} {
		output.Reset()
		expectedErr := errors.New("test error")
		fmt.Println(writeErrorOffset)
		base64Writer = encodeBase64Writer(&limitErrorWriter{output, writeErrorOffset, expectedErr, 0})
		_, err = io.Copy(base64Writer, strings.NewReader(input))
		if err != nil {
			t.Fatal(err)
		}
		err = base64Writer.Close()
		if err != expectedErr {
			t.Fatal(err)
		}
	}
}

func TestDecodeBase64Reader(t *testing.T) {
	// Trivial copy
	const exampleData = "datax"
	encodedInput := base64.StdEncoding.EncodeToString([]byte(exampleData))
	output := &bytes.Buffer{}
	decodeReader := decodeBase64Reader(ioutil.NopCloser(strings.NewReader(encodedInput)))
	_, err := io.Copy(output, decodeReader)
	if err != nil {
		t.Fatal(err)
	}
	err = decodeReader.Close()
	if err != nil {
		t.Fatal(err)
	}

	outString := output.String()
	if outString != exampleData {
		t.Errorf("output:%#v expected:%#v", outString, exampleData)
	}
}
