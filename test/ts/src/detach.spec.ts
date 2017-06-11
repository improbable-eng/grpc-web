import {assert} from "chai";
import detach from "../../../ts/src/detach";
import {UncaughtExceptionListener} from "./util";

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