// package: improbable.grpcweb.test
// file: improbable/grpcweb/test/test.proto

var improbable_grpcweb_test_test_pb = require("../../../improbable/grpcweb/test/test_pb");
var google_protobuf_empty_pb = require("google-protobuf/google/protobuf/empty_pb");
var grpc = require("@improbable-eng/grpc-web").grpc;

var TestService = (function () {
  function TestService() {}
  TestService.serviceName = "improbable.grpcweb.test.TestService";
  return TestService;
}());

TestService.PingEmpty = {
  methodName: "PingEmpty",
  service: TestService,
  requestStream: false,
  responseStream: false,
  requestType: google_protobuf_empty_pb.Empty,
  responseType: improbable_grpcweb_test_test_pb.PingResponse
};

TestService.Ping = {
  methodName: "Ping",
  service: TestService,
  requestStream: false,
  responseStream: false,
  requestType: improbable_grpcweb_test_test_pb.PingRequest,
  responseType: improbable_grpcweb_test_test_pb.PingResponse
};

TestService.PingError = {
  methodName: "PingError",
  service: TestService,
  requestStream: false,
  responseStream: false,
  requestType: improbable_grpcweb_test_test_pb.PingRequest,
  responseType: google_protobuf_empty_pb.Empty
};

TestService.PingList = {
  methodName: "PingList",
  service: TestService,
  requestStream: false,
  responseStream: true,
  requestType: improbable_grpcweb_test_test_pb.PingRequest,
  responseType: improbable_grpcweb_test_test_pb.PingResponse
};

TestService.PingPongBidi = {
  methodName: "PingPongBidi",
  service: TestService,
  requestStream: true,
  responseStream: true,
  requestType: improbable_grpcweb_test_test_pb.PingRequest,
  responseType: improbable_grpcweb_test_test_pb.PingResponse
};

TestService.PingStream = {
  methodName: "PingStream",
  service: TestService,
  requestStream: true,
  responseStream: false,
  requestType: improbable_grpcweb_test_test_pb.PingRequest,
  responseType: improbable_grpcweb_test_test_pb.PingResponse
};

TestService.Echo = {
  methodName: "Echo",
  service: TestService,
  requestStream: false,
  responseStream: false,
  requestType: improbable_grpcweb_test_test_pb.TextMessage,
  responseType: improbable_grpcweb_test_test_pb.TextMessage
};

exports.TestService = TestService;

function TestServiceClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

TestServiceClient.prototype.pingEmpty = function pingEmpty(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(TestService.PingEmpty, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

TestServiceClient.prototype.ping = function ping(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(TestService.Ping, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

TestServiceClient.prototype.pingError = function pingError(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(TestService.PingError, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

TestServiceClient.prototype.pingList = function pingList(requestMessage, metadata) {
  var listeners = {
    data: [],
    end: [],
    status: []
  };
  var client = grpc.invoke(TestService.PingList, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onMessage: function (responseMessage) {
      listeners.data.forEach(function (handler) {
        handler(responseMessage);
      });
    },
    onEnd: function (status, statusMessage, trailers) {
      listeners.status.forEach(function (handler) {
        handler({ code: status, details: statusMessage, metadata: trailers });
      });
      listeners.end.forEach(function (handler) {
        handler({ code: status, details: statusMessage, metadata: trailers });
      });
      listeners = null;
    }
  });
  return {
    on: function (type, handler) {
      listeners[type].push(handler);
      return this;
    },
    cancel: function () {
      listeners = null;
      client.close();
    }
  };
};

TestServiceClient.prototype.pingPongBidi = function pingPongBidi(metadata) {
  var listeners = {
    data: [],
    end: [],
    status: []
  };
  var client = grpc.client(TestService.PingPongBidi, {
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport
  });
  client.onEnd(function (status, statusMessage, trailers) {
    listeners.status.forEach(function (handler) {
      handler({ code: status, details: statusMessage, metadata: trailers });
    });
    listeners.end.forEach(function (handler) {
      handler({ code: status, details: statusMessage, metadata: trailers });
    });
    listeners = null;
  });
  client.onMessage(function (message) {
    listeners.data.forEach(function (handler) {
      handler(message);
    })
  });
  client.start(metadata);
  return {
    on: function (type, handler) {
      listeners[type].push(handler);
      return this;
    },
    write: function (requestMessage) {
      client.send(requestMessage);
      return this;
    },
    end: function () {
      client.finishSend();
    },
    cancel: function () {
      listeners = null;
      client.close();
    }
  };
};

TestServiceClient.prototype.pingStream = function pingStream(metadata) {
  var listeners = {
    end: [],
    status: []
  };
  var client = grpc.client(TestService.PingStream, {
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport
  });
  client.onEnd(function (status, statusMessage, trailers) {
    listeners.status.forEach(function (handler) {
      handler({ code: status, details: statusMessage, metadata: trailers });
    });
    listeners.end.forEach(function (handler) {
      handler({ code: status, details: statusMessage, metadata: trailers });
    });
    listeners = null;
  });
  return {
    on: function (type, handler) {
      listeners[type].push(handler);
      return this;
    },
    write: function (requestMessage) {
      if (!client.started) {
        client.start(metadata);
      }
      client.send(requestMessage);
      return this;
    },
    end: function () {
      client.finishSend();
    },
    cancel: function () {
      listeners = null;
      client.close();
    }
  };
};

TestServiceClient.prototype.echo = function echo(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(TestService.Echo, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

exports.TestServiceClient = TestServiceClient;

var TestUtilService = (function () {
  function TestUtilService() {}
  TestUtilService.serviceName = "improbable.grpcweb.test.TestUtilService";
  return TestUtilService;
}());

TestUtilService.ContinueStream = {
  methodName: "ContinueStream",
  service: TestUtilService,
  requestStream: false,
  responseStream: false,
  requestType: improbable_grpcweb_test_test_pb.ContinueStreamRequest,
  responseType: google_protobuf_empty_pb.Empty
};

TestUtilService.CheckStreamClosed = {
  methodName: "CheckStreamClosed",
  service: TestUtilService,
  requestStream: false,
  responseStream: false,
  requestType: improbable_grpcweb_test_test_pb.CheckStreamClosedRequest,
  responseType: improbable_grpcweb_test_test_pb.CheckStreamClosedResponse
};

exports.TestUtilService = TestUtilService;

function TestUtilServiceClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

TestUtilServiceClient.prototype.continueStream = function continueStream(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(TestUtilService.ContinueStream, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

TestUtilServiceClient.prototype.checkStreamClosed = function checkStreamClosed(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(TestUtilService.CheckStreamClosed, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

exports.TestUtilServiceClient = TestUtilServiceClient;

var FailService = (function () {
  function FailService() {}
  FailService.serviceName = "improbable.grpcweb.test.FailService";
  return FailService;
}());

FailService.NonExistant = {
  methodName: "NonExistant",
  service: FailService,
  requestStream: false,
  responseStream: false,
  requestType: improbable_grpcweb_test_test_pb.PingRequest,
  responseType: improbable_grpcweb_test_test_pb.PingResponse
};

exports.FailService = FailService;

function FailServiceClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

FailServiceClient.prototype.nonExistant = function nonExistant(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(FailService.NonExistant, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

exports.FailServiceClient = FailServiceClient;

