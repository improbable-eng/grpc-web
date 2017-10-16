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
const REQUEST_HEADERS = new BrowserHeaders({'Request-Header-Key': 'Request Value'});
const RESPONSE_HEADERS = new BrowserHeaders({'Response-Header-Key': 'Response Header Value'});
const RESPONSE_TRAILERS = new BrowserHeaders({'Response-Trailer-Key': 'Response Trailer Value'});

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
        TestDebuggerA.verify();
        TestDebuggerB.verify();
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

class MockDebugger implements Debugger {

  id: number;
  method: any;
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

  verify() {
    assert.deepEqual(this.host, HOST);
    assert.deepEqual(this.method, METHOD);
    assert.deepEqual(this.requestHeaders, REQUEST_HEADERS);
    assert.deepEqual(this.requestMessage, PING);
    assert.deepEqual(this.responseHeaders, RESPONSE_HEADERS);
    assert.deepEqual(this.responseMessage, PONG);
    assert.deepEqual(this.responseTrailers, RESPONSE_TRAILERS);
    assert.deepEqual(this.httpStatus, 200);
    assert.deepEqual(this.grpcStatus, Code.OK);
    assert.deepEqual(this.err, null);
  }

}
