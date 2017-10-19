import {assert} from "chai";
import {
  ConsoleDebugger, ConsoleDebuggerFactory,
  Debugger, DebuggerDispatch,
  DebuggerFactory,
  getDebuggers, MessageMethodDefinition,
  registerDebugger,
  removeDebugger
} from "../../../ts/src/debug";
import * as sinon from "Sinon";
import {Metadata, BrowserHeaders} from "../../../ts/src/index";
import { Message } from 'google-protobuf';
import {Code} from "../../../ts/src/Code";
import {
  PingRequest,
  PingResponse,
} from "../_proto/improbable/grpcweb/test/test_pb";
import {TestService} from "../_proto/improbable/grpcweb/test/test_pb_service";
import {grpc} from "../../../ts/src/grpc";
import UnaryMethodDefinition = grpc.UnaryMethodDefinition;
import detach from "../../../ts/src/detach";

const TestDebuggerFactory: DebuggerFactory = (id: number) => TestDebugger;
const TestDebugger: sinon.SinonStubbedInstance<ConsoleDebugger> = sinon.createStubInstance(ConsoleDebugger);
const MockDebuggerFactory: DebuggerFactory = (id: number) => new MockDebugger(id);
const ThrowingDebuggerFactory :DebuggerFactory = (id: number) => new ThrowingDebugger();

const REQUEST_ID = 123;
const HOST = 'http://test.host.here';
const METHOD = TestService.PingList as any as UnaryMethodDefinition<PingRequest, PingResponse>;
const PING = new PingRequest();
const PONG = new PingResponse();
const REQUEST_HEADERS: Metadata = new BrowserHeaders({'Request-Header-Key': 'Request Value'});
const RESPONSE_HEADERS: Metadata = new BrowserHeaders({'Response-Header-Key': 'Response Header Value'});
const RESPONSE_TRAILERS: Metadata = new BrowserHeaders({'Response-Trailer-Key': 'Response Trailer Value'});

const TestDebuggerFactory: DebuggerFactory = (id: number) => new TestDebugger(id);

describe('debug', () => {

  afterEach(() => {
    getDebuggers().forEach(dbg => removeDebugger(dbg));
  });

  it('has no debuggers registered initially', () => {
    assert.strictEqual(getDebuggers().length, 0);
  });

  describe('register a debugger', () => {

    it('should register a debugger', () => {
      registerDebugger(TestDebuggerFactory);

      assert.strictEqual(getDebuggers().length, 1);
      assert.deepEqual(getDebuggers()[0], TestDebuggerFactory);
    });

    it('should register multiple debuggers in the order provided', () => {
      registerDebugger(TestDebuggerFactory, ConsoleDebuggerFactory);

      assert.strictEqual(getDebuggers().length, 2);
      assert.deepEqual(getDebuggers()[0], TestDebuggerFactory);
      assert.deepEqual(getDebuggers()[1], ConsoleDebuggerFactory);
    });

  });

  describe('remove a debugger', () => {

    it('should fail gracefully when removing a debugger which does not exist', () => {
      const outcome = removeDebugger(TestDebuggerFactory);
      assert.isFalse(outcome);
    });

    it('should remove a debugger from the list of debuggers', () => {
      registerDebugger(TestDebuggerFactory);
      assert.equal(getDebuggers().length, 1);

      const outcome = removeDebugger(TestDebuggerFactory);
      assert.isTrue(outcome);
      assert.equal(getDebuggers().length, 0);
    });

    it('should remove only the debugger requested', () => {
      registerDebugger(TestDebuggerFactory, ConsoleDebuggerFactory);
      assert.equal(getDebuggers().length, 2);

      const outcome = removeDebugger(TestDebuggerFactory);
      assert.isTrue(outcome);
      assert.equal(getDebuggers()[0], ConsoleDebuggerFactory);
    });

    it('should retain ordering of debuggers when one is removed', () => {
      registerDebugger(TestDebuggerFactory, ConsoleDebuggerFactory, MockDebuggerFactory);
      assert.equal(getDebuggers().length, 3)

      const outcome = removeDebugger(ConsoleDebuggerFactory);
      assert.isTrue(outcome);
      assert.equal(getDebuggers()[0], TestDebuggerFactory);
      assert.equal(getDebuggers()[1], MockDebuggerFactory);
    });

  });

  describe('Debugger Dispatch', () => {

    it('should gracefully handle no debuggers', () => {
      const dispatch = new DebuggerDispatch(REQUEST_ID);

      assert.doesNotThrow(() => dispatch.onRequestStart(HOST, METHOD));
      assert.doesNotThrow(() => dispatch.onRequestHeaders(REQUEST_HEADERS));
      assert.doesNotThrow(() => dispatch.onRequestMessage(PING));
      assert.doesNotThrow(() => dispatch.onResponseHeaders(RESPONSE_HEADERS, 200));
      assert.doesNotThrow(() => dispatch.onResponseMessage(PONG));
      assert.doesNotThrow(() => dispatch.onResponseTrailers(RESPONSE_TRAILERS));
      assert.doesNotThrow(() => dispatch.onResponseEnd(Code.OK, null));
    });

    it('should delegate to all registered debuggers', (done) => {
      const TestDebuggerA = new MockDebugger(REQUEST_ID);
      const DbgFactoryA: DebuggerFactory = (id: number) => TestDebuggerA;

      const TestDebuggerB = new MockDebugger(REQUEST_ID);
      const DbgFactoryB: DebuggerFactory = (id: number) => TestDebuggerB;

      registerDebugger(DbgFactoryA, DbgFactoryB);

      const dispatch = new DebuggerDispatch(REQUEST_ID);

      assert.doesNotThrow(() => dispatch.onRequestStart(HOST, METHOD));
      assert.doesNotThrow(() => dispatch.onRequestHeaders(REQUEST_HEADERS));
      assert.doesNotThrow(() => dispatch.onRequestMessage(PING));
      assert.doesNotThrow(() => dispatch.onResponseHeaders(RESPONSE_HEADERS, 200));
      assert.doesNotThrow(() => dispatch.onResponseMessage(PONG));
      assert.doesNotThrow(() => dispatch.onResponseTrailers(RESPONSE_TRAILERS));
      assert.doesNotThrow(() => dispatch.onResponseEnd(Code.OK, null));

      // Must detach since dispatch also detaches from the cycle
      detach(() => {
        const expected = {
          host: HOST,
          method: METHOD,
          requestHeaders: REQUEST_HEADERS,
          requestMessage: PING,
          responseHeaders: RESPONSE_HEADERS,
          responseMessage: PONG,
          responseTrailers: RESPONSE_TRAILERS,
          httpStatus: 200,
          grpcStatus: Code.OK,
          error: null,
        };
        TestDebuggerA.verify(expected);
        TestDebuggerB.verify(expected);
        done();
      })

    });

    it('should gracefully construct dispatch if debugger factory fails', () => {
      const rektDebuggerFactory: DebuggerFactory = (id: number) => { throw new Error('test'); };
      registerDebugger(rektDebuggerFactory);

      let dispatch: DebuggerDispatch;
      assert.doesNotThrow(() => dispatch = new DebuggerDispatch(REQUEST_ID));

      assert.doesNotThrow(() => dispatch.onRequestStart(HOST, METHOD));
      assert.doesNotThrow(() => dispatch.onRequestHeaders(REQUEST_HEADERS));
      assert.doesNotThrow(() => dispatch.onRequestMessage(PING));
      assert.doesNotThrow(() => dispatch.onResponseHeaders(RESPONSE_HEADERS, 200));
      assert.doesNotThrow(() => dispatch.onResponseMessage(PONG));
      assert.doesNotThrow(() => dispatch.onResponseTrailers(RESPONSE_TRAILERS));
      assert.doesNotThrow(() => dispatch.onResponseEnd(Code.OK, null));
    });

    it('should gracefully handle a debugger with errors', () => {
      registerDebugger(ThrowingDebuggerFactory);

      const dispatch = new DebuggerDispatch(REQUEST_ID);

      assert.doesNotThrow(() => dispatch.onRequestStart(HOST, METHOD));
      assert.doesNotThrow(() => dispatch.onRequestHeaders(REQUEST_HEADERS));
      assert.doesNotThrow(() => dispatch.onRequestMessage(PING));
      assert.doesNotThrow(() => dispatch.onResponseHeaders(RESPONSE_HEADERS, 200));
      assert.doesNotThrow(() => dispatch.onResponseMessage(PONG));
      assert.doesNotThrow(() => dispatch.onResponseTrailers(RESPONSE_TRAILERS));
      assert.doesNotThrow(() => dispatch.onResponseEnd(Code.OK, null));
    });

  });

});

class ThrowingDebugger implements Debugger {

  onRequestStart(host: string, method: MessageMethodDefinition): void {
    throw new Error("Method not implemented.");
  }
  onRequestHeaders(headers: Metadata): void {
    throw new Error("Method not implemented.");
  }

  onRequestMessage(payload: Message): void {
    throw new Error("Method not implemented.");
  }

  onResponseHeaders(headers: Metadata, httpStatus: number): void {
    throw new Error("Method not implemented.");
  }

  onResponseMessage(payload: Message): void {
    throw new Error("Method not implemented.");
  }

  onResponseTrailers(metadata: Metadata): void {
    throw new Error("Method not implemented.");
  }

  onResponseEnd(grpcStatus: Code, err: Error | null): void {
    throw new Error("Method not implemented.");
  }

}

interface GrpcInvocation {
  host: string;
  method: MessageMethodDefinition;
  requestHeaders: Metadata;
  requestMessage: Message;
  responseHeaders: Metadata;
  responseMessage: Message;
  responseTrailers: Metadata;
  httpStatus: number;
  grpcStatus: Code;
  error: Error | null;
}

export class MockDebugger implements Debugger {

  id: number;
  method: MessageMethodDefinition;
  host: string;
  requestHeaders: Metadata;
  requestMessage: Message;
  responseHeaders: Metadata;
  httpStatus: number;
  responseMessage: Message;
  responseTrailers: Metadata;
  grpcStatus: Code;
  err: Error | null;

  constructor(id: number) {
    this.id = id;
  }

  onRequestStart(host: string, method: MessageMethodDefinition): void {
    this.host = host;
    this.method = method;
  }

  onRequestHeaders(headers: Metadata): void {
    this.requestHeaders = headers;
  }

  onRequestMessage(payload: Message): void {
    this.requestMessage = payload;
  }

  onResponseHeaders(headers: Metadata, httpStatus: number): void {
    this.responseHeaders = headers;
    this.httpStatus = httpStatus;
  }

  onResponseMessage(payload: Message): void {
    this.responseMessage = payload;
  }

  onResponseTrailers(metadata: Metadata): void {
    this.responseTrailers = metadata;
  }

  onResponseEnd(grpcStatus: Code, err: Error | null): void {
    this.grpcStatus = grpcStatus;
    this.err = err;
  }

  verify(attributes: GrpcInvocation): void {
    assert.deepEqual(this.host, attributes.host);
    assert.deepEqual(this.method, attributes.method);
    assert.deepEqual(this.requestHeaders, attributes.requestHeaders);
    assert.deepEqual(this.requestMessage, attributes.requestMessage);
    assert.deepEqual(this.responseHeaders, attributes.responseHeaders);
    assert.deepEqual(this.responseMessage, attributes.responseMessage);
    assert.deepEqual(this.responseTrailers, attributes.responseTrailers);
    assert.deepEqual(this.httpStatus, attributes.httpStatus);
    assert.deepEqual(this.grpcStatus, attributes.grpcStatus);
    assert.deepEqual(this.err, attributes.error);
  }

}

// function buildDebuggerMock(): sinon.SinonMock {
//   const mockDebugger = sinon.mock(new ThrowingDebugger());
//   mockDebugger.expects('onRequestStart').once().withArgs(HOST, METHOD).returns(true);
//   mockDebugger.expects('onRequestHeaders').once().withArgs(REQUEST_HEADERS).returns(true);
//   mockDebugger.expects('onRequestMessage').once().withArgs(PING).returns(true);
//   mockDebugger.expects('onResponseHeaders').once().withArgs(RESPONSE_HEADERS, 200).returns(true);
//   mockDebugger.expects('onResponseMessage').once().withArgs(PONG).returns(true);
//   mockDebugger.expects('onResponseTrailers').once().withArgs(RESPONSE_TRAILERS).returns(true);
//   mockDebugger.expects('onResponseEnd').once().withArgs(Code.OK, null).returns(true);
//
//   return mockDebugger;
// }

  describe('registerDebugger', () => {

    it('should register a debugger', () => {
      registerDebugger()
    })

  })


})


describe("detach", () => {
  describe("basic execution ordering", () => {
    it("should invoke a function", (done) => {
      detach(() => {
        done();
      });
    });

    it("should invoke multiple functions in the order they are added", (done) => {
      let index = 0;
      detach(() => {
        assert.equal(index, 0);
        index++;
      });
      detach(() => {
        assert.equal(index, 1);
        index++;
      });
      detach(() => {
        assert.equal(index, 2);
        index++;
        done();
      });
    });

    it("should invoke multiple functions in the order they are added after the current context", (done) => {
      let index = 0;
      detach(() => {
        assert.equal(index, 5);
        index++;
      });
      detach(() => {
        assert.equal(index, 6);
        index++;
      });
      detach(() => {
        assert.equal(index, 7);
        index++;
        done();
      });
      index = 5; // This should be run before the first callback
    });
  });

  describe("exception handling", () => {
    let uncaughtHandler: UncaughtExceptionListener;
    beforeEach(() => {
      uncaughtHandler = new UncaughtExceptionListener();
      uncaughtHandler.attach();
    });

    afterEach(() => {
      uncaughtHandler.detach();
    });

    it("should invoke remaining function when exceptions are thrown", (done) => {
      let index = 0;
      detach(() => {
        assert.equal(index, 0);
        index++;
      });
      detach(() => {
        assert.equal(index, 1);
        index++;
        throw new Error("Second callback threw error");
      });
      detach(() => {
        assert.equal(index, 2);
        index++;
        throw new Error("Third callback threw error");
      });
      detach(() => {
        uncaughtHandler.detach();
        assert.equal(index, 3);
        index++;
        const exceptionsCaught = uncaughtHandler.getMessages();
        assert.lengthOf(exceptionsCaught, 2);
        assert.include(exceptionsCaught[0], "Second callback threw error");
        assert.include(exceptionsCaught[1], "Third callback threw error");
        done();
      });
    });

    // This test is weakly-held. It is here to detect changes to execution ordering with other contexts, but detach
    // should not be used in a manner that relies on this behaviour.
    it("should invoke remaining function when exceptions are thrown", (done) => {
      let index = 0;
      detach(() => {
        assert.equal(index, 0);
        index++;
      });
      detach(() => {
        assert.equal(index, 1);
        index++;
        throw new Error("Second callback threw error");
      });
      // setTimeout below will be called between the above and below functions
      detach(() => {
        assert.equal(index, 3);
        index++;
        setTimeout(() => {
          assert.equal(index, 4);
          index++;
        }, 0);
        throw new Error("Third callback threw error");
      });
      detach(() => {
        uncaughtHandler.detach();
        assert.equal(index, 5);
        index++;
        const exceptionsCaught = uncaughtHandler.getMessages();
        assert.lengthOf(exceptionsCaught, 2);
        assert.include(exceptionsCaught[0], "Second callback threw error");
        assert.include(exceptionsCaught[1], "Third callback threw error");
        done();
      });

      // This function will be called after the first exception is thrown. Throwing exceptions causes the subsequent
      // callbacks to be run in a separate, subsequent timeout.
      setTimeout(() => {
        assert.equal(index, 2);
        index++;
      }, 0);
    });
  });
});
