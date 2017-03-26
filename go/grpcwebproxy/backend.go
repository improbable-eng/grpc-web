package main

import (
	"github.com/spf13/pflag"
	"crypto/tls"
	"google.golang.org/grpc"
	"github.com/Sirupsen/logrus"
	"google.golang.org/grpc/credentials"
	"crypto/x509"
	"io/ioutil"
)

var (
	flagBackendHostPort = pflag.String(
		"backend_addr",
		"",
		"A host:port (IP or hostname) of the gRPC server to forward it to.")

	flagBackendIsInsecure = pflag.Bool(
		"backend_tls",
		false,
		"Whether the gRPC server of the backend is serving in plaintext (false) or over TLS (true).",
	)

	flagBackendTlsNoVerify = pflag.Bool(
		"backend_tls_noverify",
		false,
		"Whether to ignore TLS verification checks (cert validity, hostname). *DO NOT USE IN PRODUCTION*.",
	)

	flagBackendTlsCa = pflag.StringSlice(
		"backend_tls_ca_files",
		[]string{},
		"Paths (comma separated) to PEM certificate chains used for verification of backend certificates. If empty, host CA chain will be used.",
	)

)

func dialBackendOrFail() *grpc.ClientConn {
	if *flagBackendHostPort == "" {
		logrus.Fatalf("flag 'backend_host_port' must be set")
	}
	opt := []grpc.DialOption{}
	if *flagBackendIsInsecure {
		opt = append(opt, grpc.WithInsecure())
	} else {
		opt = append(opt, grpc.WithTransportCredentials(credentials.NewTLS(buildBackendTlsOrFail())))
	}
	cc, err := grpc.Dial(*flagBackendHostPort, opt...)
	if err != nil {
		logrus.Fatalf("failed dialing backend: %v", err)
	}
	return cc
}


func buildBackendTlsOrFail() *tls.Config {
	tlsConfig := &tls.Config{}
	tlsConfig.MinVersion = tls.VersionTLS12
	if *flagBackendTlsNoVerify {
		tlsConfig.InsecureSkipVerify = true
	} else {
		if len(*flagBackendTlsCa) > 0 {
			tlsConfig.ClientCAs = x509.NewCertPool()
			for _, path := range *flagBackendTlsCa {
				data, err := ioutil.ReadFile(path)
				if err != nil {
					logrus.Fatalf("failed reading backend CA file %v: %v", path, err)
				}
				if ok := tlsConfig.ClientCAs.AppendCertsFromPEM(data); !ok {
					logrus.Fatalf("failed processing backend CA file %v", path)
				}
			}
		}
	}
	return tlsConfig
}