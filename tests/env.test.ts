import { RPCHandler } from "../types/rpc-handler";
import { testConfig } from "./rpc-handler.test";

describe("Browser env detection", () => {
  // @ts-expect-error globalThis
  const windowMock: Window & typeof globalThis = {
    ...globalThis,
    name: "Window",
  };

  Object.defineProperty(global, "window", {
    value: windowMock,
    configurable: true,
  });

  it("should detect a browser env", () => {
    const rpcHandler = new RPCHandler(testConfig);
    expect(rpcHandler["_env"]).toBe("browser");

    // @ts-expect-error globalThis
    delete global.window;

    const rpcHandler2 = new RPCHandler(testConfig);
    expect(rpcHandler2["_env"]).toBe("node");
  });
});
