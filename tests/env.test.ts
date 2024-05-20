import { RPCHandler } from "../dist";
import { testConfig } from "./rpc-handler.test";

describe("Browser env detection", () => {
  // @ts-expect-error globalThis
  const windowMock: Window & typeof globalThis = {
    ...globalThis,
    name: "Window",
  };

  Object.defineProperty(global, "window", {
    value: windowMock,
  });

  it("should a browser env", () => {
    const rpcHandler = new RPCHandler(testConfig);
    expect(rpcHandler["_env"]).toBe("browser");
  });
});
