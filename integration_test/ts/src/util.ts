import {ContinueStreamRequest} from "../_proto/improbable/grpcweb/test/test_pb";
import {TestUtilService} from "../_proto/improbable/grpcweb/test/test_pb_service";
import {
  grpc,
} from "@improbable-eng/grpc-web";

export const DEBUG: boolean = (global as any).DEBUG;
export const DISABLE_CORS_TESTS: boolean = (global as any).DISABLE_CORS_TESTS;
export const DISABLE_WEBSOCKET_TESTS: boolean = (global as any).DISABLE_WEBSOCKET_TESTS;

export class UncaughtExceptionListener {
  private attached: boolean = false;
  private exceptionsCaught: string[] = [];
  private originalWindowHandler?: OnErrorEventHandler;
  private originalProcessHandlers: Function[] = [];
  private processListener: (err: Error) => void;

  constructor() {
    const self = this;

    self.originalWindowHandler = typeof window !== "undefined" ? window.onerror : undefined;
    self.processListener = (err: Error) => {
      self.exceptionsCaught.push(err.message);
    };
  }

  attach() {
    const self = this;

    if (self.attached) {
      return;
    }
    if (typeof window !== "undefined") {
      window.onerror = function (message: string) {
        self.exceptionsCaught.push(message);
      };
    } else {
      // Remove existing listeners - necessary to prevent test runners from exiting on exceptions
      self.originalProcessHandlers = process.listeners("uncaughtException");
      process.removeAllListeners("uncaughtException");
      process.addListener("uncaughtException", self.processListener);
    }
    self.attached = true;
  }

  detach() {
    const self = this;

    if (!self.attached) {
      return;
    }
    if (typeof window !== "undefined") {
      window.onerror = self.originalWindowHandler!;
    } else {
      process.removeListener("uncaughtException", self.processListener);
      self.originalProcessHandlers.forEach((handler: (error: Error) => void) => {
        process.addListener("uncaughtException", handler);
      });
      self.originalProcessHandlers = [];
    }
    self.attached = false;
  }

  getMessages() {
    return this.exceptionsCaught;
  }
}

export function continueStream(host: string, streamIdentifier: string, cb: (status: grpc.Code) => void) {
  const req = new ContinueStreamRequest();
  req.setStreamIdentifier(streamIdentifier);
  grpc.unary(TestUtilService.ContinueStream, {
    debug: DEBUG,
    request: req,
    host: host,
    onEnd: ({status}) => {
      cb(status);
    },
  })
}
