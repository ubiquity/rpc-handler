import { RPCHandler } from "../src/rpc-handler";
import { testConfig } from "./constants/test-constants";

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
    // but has bypassed the env === browser check
    expect(() => {
      RPCHandler.getInstance(1, {
        ...testConfig,
        autoStorage: true,
      });
    }).toThrow("localStorage is not defined");
  });
});
