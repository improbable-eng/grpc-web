all: terminator_go

terminator_go: terminator.proto
	PATH="${GOPATH}/bin:${PATH}" protoc \
	  -I. \
		-I${GOPATH}/src \
		--go_out=plugins=grpc:. \
		terminator.proto

