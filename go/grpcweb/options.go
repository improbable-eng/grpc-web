//Copyright 2017 Improbable. All Rights Reserved.
// See LICENSE for licensing terms.

package grpcweb

var (
	defaultOptions = &options{}
)

type options struct {
	enableWebsockets bool
}

func evaluateOptions(opts []Option) *options {
	optCopy := &options{}
	*optCopy = *defaultOptions
	for _, o := range opts {
		o(optCopy)
	}
	return optCopy
}

type Option func(*options)

// WithWebsockets allows for handling grpc-web requests of websockets - enabling bidirectional requests.
//
// The default behaviour is false, i.e. to disallow websockets
func WithWebsockets(enableWebsockets bool) Option {
	return func(o *options) {
		o.enableWebsockets = enableWebsockets
	}
}
