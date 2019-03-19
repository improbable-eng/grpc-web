import {FakeTransportBuilder} from "./index";

describe("FakeTransportBuilder", () => {
  it("should work", () => {
    new FakeTransportBuilder()
      .withMessages([ "hello" ]);
  })
});