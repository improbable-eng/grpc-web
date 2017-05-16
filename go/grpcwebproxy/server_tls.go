package main

import (
	"crypto/tls"

	logrus "github.com/Sirupsen/logrus"
	"github.com/mwitkow/go-conntrack/connhelpers"
	"github.com/spf13/pflag"

	"crypto/x509"
	"io/ioutil"
)

var (
	flagTLSServerCert = pflag.String(
		"server_tls_cert_file",
		"",
		"Path to the PEM certificate for server use.")

	flagTLSServerKey = pflag.String(
		"server_tls_key_file",
		"../misc/localhost.key",
		"Path to the PEM key for the certificate for the server use.")

	flagTLSServerClientCertVerification = pflag.String(
		"server_tls_client_cert_verification",
		"none",
		"Controls whether a client certificate is on. Values: none, verify_if_given, require.")

	flagTLSServerClientCAFiles = pflag.StringSlice(
		"server_tls_client_ca_files",
		[]string{},
		"Paths (comma separated) to PEM certificate chains used for client-side verification. If empty, host CA chain will be used.",
	)
)

func buildServerTLSOrFail() *tls.Config {
	if *flagTLSServerCert == "" || *flagTLSServerKey == "" {
		logrus.Fatalf("flags server_tls_cert_file and server_tls_key_file must be set")
	}
	tlsConfig, err := connhelpers.TlsConfigForServerCerts(*flagTLSServerCert, *flagTLSServerKey)
	if err != nil {
		logrus.Fatalf("failed reading TLS server keys: %v", err)
	}
	tlsConfig.MinVersion = tls.VersionTLS12
	switch *flagTLSServerClientCertVerification {
	case "none":
		tlsConfig.ClientAuth = tls.NoClientCert
	case "verify_if_given":
		tlsConfig.ClientAuth = tls.VerifyClientCertIfGiven
	case "require":
		tlsConfig.ClientAuth = tls.RequireAndVerifyClientCert
	default:
		logrus.Fatalf("Uknown value '%v' for server_tls_client_cert_verification", *flagTLSServerClientCertVerification)
	}
	if tlsConfig.ClientAuth != tls.NoClientCert {
		if len(*flagTLSServerClientCAFiles) > 0 {
			tlsConfig.ClientCAs = x509.NewCertPool()
			for _, path := range *flagTLSServerClientCAFiles {
				data, err := ioutil.ReadFile(path)
				if err != nil {
					logrus.Fatalf("failed reading client CA file %v: %v", path, err)
				}
				if ok := tlsConfig.ClientCAs.AppendCertsFromPEM(data); !ok {
					logrus.Fatalf("failed processing client CA file %v", path)
				}
			}
		} else {
			var err error
			tlsConfig.ClientCAs, err = x509.SystemCertPool()
			if err != nil {
				logrus.Fatalf("no client CA files specified, fallback to system CA chain failed: %v", err)
			}
		}

	}
	tlsConfig, err = connhelpers.TlsConfigWithHttp2Enabled(tlsConfig)
	if err != nil {
		logrus.Fatalf("can't configure h2 handling: %v", err)
	}
	return tlsConfig
}
