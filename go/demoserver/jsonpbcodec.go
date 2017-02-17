package main

import (
	"bytes"
	"github.com/golang/protobuf/jsonpb"
	"github.com/golang/protobuf/proto"
)

type jsonpbCodec struct {
	m *jsonpb.Marshaler
	u *jsonpb.Unmarshaler
}

func NewJsonPBCodec() *jsonpbCodec {
	return &jsonpbCodec{
		m: &jsonpb.Marshaler{OrigName: true},
		u: &jsonpb.Unmarshaler{},
	}
}

func (c *jsonpbCodec) Marshal(v interface{}) ([]byte, error) {
	out, err := c.m.MarshalToString(v.(proto.Message))
	return []byte(out), err
}

func (c *jsonpbCodec) Unmarshal(data []byte, v interface{}) error {
	bReader := bytes.NewReader(data)
	return c.u.Unmarshal(bReader, v.(proto.Message))
}

func (c *jsonpbCodec) String() string {
	return "json"
}
