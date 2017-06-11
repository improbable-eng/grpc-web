export class UncaughtExceptionListener {
  private attached: boolean = false;
  private exceptionsCaught: string[] = [];
  private originalWindowHandler?: ErrorEventHandler;
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
      self.originalProcessHandlers = process.listeners('uncaughtException');
      process.removeAllListeners('uncaughtException');
      process.addListener('uncaughtException', self.processListener);
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
      process.removeListener('uncaughtException', self.processListener);
      self.originalProcessHandlers.forEach(handler => {
        process.addListener('uncaughtException', handler);
      });
      self.originalProcessHandlers = [];
    }
    self.attached = false;
  }

  getMessages() {
    return this.exceptionsCaught;
  }
}
