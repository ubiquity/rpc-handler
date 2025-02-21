import { HandlerConstructorConfig } from "../types/handler";
import { PrettyLogs } from "../types/logs";
import { RPCHandler } from "../types/rpc-handler";

export const testConfig: HandlerConstructorConfig = {
  networkId: "100",
  autoStorage: false,
  cacheRefreshCycles: 3,
  networkName: null,
  networkRpcs: null,
  rpcTimeout: 600,
  runtimeRpcs: null,
  exclusions: null,
  proxySettings: {
    retryCount: 3,
    retryDelay: 10,
    logTier: "info",
    logger: new PrettyLogs(),
    strictLogs: true,
  },
};

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
