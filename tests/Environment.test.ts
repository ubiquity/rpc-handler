import { RPCHandler } from "../src/rpc-handler";

describe("Browser env detection", () => {
  const windowMock: Window & typeof globalThis = {
    ...globalThis,
  };
  Object.defineProperty(global, "window", {
    value: windowMock,
  });

  it("should detect a browser environment", () => {
    // This will fail with the following error:
    // localStorage is not defined
    // proving that the test is not running in a browser environment
    // but has bypassed the (this._env === browse)r check
    expect(() => {
      RPCHandler.getInstance(1);
    }).toThrow("localStorage is not defined");
  });
});
