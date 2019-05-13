import {assert} from "chai";
import detach from "./detach";

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
});
