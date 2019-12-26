load("@bazel_gazelle//:deps.bzl", "go_repository")

def go_deps():
  go_repository(
    name = "com_github_grpc_ecosystem_go_grpc_middleware",
    importpath = "github.com/grpc-ecosystem/go-grpc-middleware",
    sum = "h1:THDBEeQ9xZ8JEaCLyLQqXMMdRqNr0QAUJTIkQAUtFjg=",
    version = "v1.1.0",
  )

  go_repository(
    name = "com_github_grpc_ecosystem_go_grpc_prometheus",
    importpath = "github.com/grpc-ecosystem/go-grpc-prometheus",
    sum = "h1:Ovs26xHkKqVztRpIrF/92BcuyuQ/YW4NSIpoGtfXNho=",
    version = "v1.2.0",
  )

  go_repository(
    name = "com_github_mwitkow_go_conntrack",
    importpath = "github.com/mwitkow/go-conntrack",
    sum = "h1:KUppIJq7/+SVif2QVs3tOP0zanoHgBEVAwHxUSIzRqU=",
    version = "v0.0.0-20190716064945-2f068394615f",
  )

  go_repository(
    name = "com_github_mwitkow_grpc_proxy",
    importpath = "github.com/mwitkow/grpc-proxy",
    sum = "h1:0xuRacu/Zr+jX+KyLLPPktbwXqyOvnOPUQmMLzX1jxU=",
    version = "v0.0.0-20181017164139-0f1106ef9c76",
  )

  go_repository(
    name = "com_github_prometheus_client_golang",
    importpath = "github.com/prometheus/client_golang",
    sum = "h1:miYCvYqFXtl/J9FIy8eNpBfYthAEFg+Ys0XyUVEcDsc=",
    version = "v1.3.0",
  )

  go_repository(
    name = "com_github_sirupsen_logrus",
    importpath = "github.com/sirupsen/logrus",
    sum = "h1:SPIRibHv4MatM3XXNO2BJeFLZwZ2LvZgfQ5+UNI2im4=",
    version = "v1.4.2",
  )

  go_repository(
    name = "com_github_spf13_pflag",
    importpath = "github.com/spf13/pflag",
    sum = "h1:iy+VFUOCP1a+8yFto/drg2CJ5u0yRoB7fZw3DKv/JXA=",
    version = "v1.0.5",
  )

  go_repository(
    name = "org_golang_google_grpc",
    importpath = "google.golang.org/grpc",
    sum = "h1:2dTRdpdFEEhJYQD8EMLB61nnrzSCTbG38PhqdhvOltg=",
    version = "v1.26.0",
  )

  go_repository(
    name = "org_golang_x_net",
    importpath = "golang.org/x/net",
    sum = "h1:efeOvDhwQ29Dj3SdAV/MJf8oukgn+8D8WgaCaRMchF8=",
    version = "v0.0.0-20191209160850-c0dbc17a3553",
  )

  go_repository(
    name = "com_github_rs_cors",
    importpath = "github.com/rs/cors",
    sum = "h1:+88SsELBHx5r+hZ8TCkggzSstaWNbDvThkVK8H6f9ik=",
    version = "v1.7.0",
  )

  go_repository(
    name = "com_github_gorilla_websocket",
    importpath = "github.com/gorilla/websocket",
    sum = "h1:q7AeDBpnBk8AogcD4DSag/Ukw/KV+YhzLj2bP5HvKCM=",
    version = "v1.4.1",
  )

  go_repository(
    name = "com_github_desertbit_timer",
    importpath = "github.com/desertbit/timer",
    sum = "h1:U5y3Y5UE0w7amNe7Z5G/twsBW0KEalRQXZzf8ufSh9I=",
    version = "v0.0.0-20180107155436-c41aec40b27f",
  )

  go_repository(
    name = "com_github_golang_protobuf",
    importpath = "github.com/golang/protobuf",
    sum = "h1:6nsPYzhq5kReh6QImI3k5qWzO4PEbvbIW2cwSfR/6xs=",
    version = "v1.3.2",
  )

  go_repository(
    name = "com_github_stretchr_testify",
    importpath = "github.com/stretchr/testify",
    sum = "h1:2E4SXV/wtOkTonXsotYi4li6zVWxYlZuYNCXe9XRJyk=",
    version = "v1.4.0",
  )

  go_repository(
    name = "org_golang_x_text",
    importpath = "golang.org/x/text",
    sum = "h1:tW2bmiBqwgJj/UpqtC8EpXEZVYOwU0yG4iWbprSVAcs=",
    version = "v0.3.2",
  )

  go_repository(
    name = "in_gopkg_yaml_v2",
    importpath = "gopkg.in/yaml.v2",
    sum = "h1:VUgggvou5XRW9mHwD/yXxIYSMtY0zoKQf/v226p2nyo=",
    version = "v2.2.7",
  )

  go_repository(
    name = "com_github_davecgh_go_spew",
    importpath = "github.com/davecgh/go-spew",
    sum = "h1:vj9j/u1bqnvCEfJOwUhtlOARqs3+rkHYY13jYWTU97c=",
    version = "v1.1.1",
  )

  go_repository(
    name = "com_github_prometheus_common",
    importpath = "github.com/prometheus/common",
    sum = "h1:L+1lyG48J1zAQXA3RBX/nG/B3gjlHq0zTt2tlbJLyCY=",
    version = "v0.7.0",
  )

  go_repository(
    name = "com_github_jpillora_backoff",
    importpath = "github.com/jpillora/backoff",
    sum = "h1:uvFg412JmmHBHw7iwprIxkPMI+sGQ4kzOWsMeHnm2EA=",
    version = "v1.0.0",
  )

  go_repository(
    name = "com_github_prometheus_procfs",
    importpath = "github.com/prometheus/procfs",
    sum = "h1:+fpWZdT24pJBiqJdAwYBjPSk+5YmQzYNPYzQsdzLkt8=",
    version = "v0.0.8",
  )

  go_repository(
    name = "com_github_prometheus_client_model",
    importpath = "github.com/prometheus/client_model",
    sum = "h1:ElTg5tNp4DqfV7UQjDqv2+RJlNzsDtvNAWccbItceIE=",
    version = "v0.1.0",
  )

  go_repository(
    name = "com_github_beorn7_perks",
    importpath = "github.com/beorn7/perks",
    sum = "h1:VlbKKnNfV8bJzeqoa4cOKqO6bYr3WgKZxO8Z16+hsOM=",
    version = "v1.0.1",
  )

  go_repository(
    name = "com_github_cespare_xxhash_v2",
    importpath = "github.com/cespare/xxhash/v2",
    sum = "h1:6MnRN8NT7+YBpUIWxHtefFZOKTAPgGjpQSxqLNn0+qY=",
    version = "v2.1.1",
  )

  go_repository(
    name = "com_github_matttproud_golang_protobuf_extensions",
    importpath = "github.com/matttproud/golang_protobuf_extensions",
    sum = "h1:4hp9jkHxhMHkqkrB3Ix0jegS5sx/RkqARlsWZ6pIwiU=",
    version = "v1.0.1",
  )