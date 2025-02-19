import { HandlerConstructorConfig } from "../types/handler";
import { PrettyLogs } from "../types/logs";

export const testConfig: HandlerConstructorConfig = {
  networkId: "1",
  autoStorage: false,
  cacheRefreshCycles: 3,
  networkName: null,
  networkRpcs: null,
  rpcTimeout: 1500,
  runtimeRpcs: null,
  tracking: "yes",
  proxySettings: {
    retryCount: 3,
    retryDelay: 10,
    logTier: "info",
    logger: new PrettyLogs(),
    strictLogs: true,
  },
};

// We need the actual responses now for blocknumber and nonceBitmap
jest.mock("axios", () => ({
  ...jest.requireActual("axios"),
}));

describe("RPCHandler", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.resetAllMocks();
    jest.resetModules();
  });

  it("executing without an rpc timeout", async () => {
    const module = await import("../types/rpc-handler");
    const rpcHandler = new module.RPCHandler({
      ...testConfig,
      // null === "TimeoutOverflowWarning: 9007199254740991 does not fit into a 32-bit signed integer.
      // Timer duration was truncated to 2147483647."
      rpcTimeout: 2147483647,
    });
    await rpcHandler.testRpcPerformance();
    const latencies = rpcHandler.getLatencies();

    const slowestRpc = latencies[Object.keys(latencies).sort((a, b) => latencies[b] - latencies[a])[0]];
    const fastestRpcUrl = latencies[Object.keys(latencies).sort((a, b) => latencies[a] - latencies[b])[0]];

    console.log("slowestRpc: without an rpc timeout > ", slowestRpc);
    console.log("fastestRpc: without an rpc timeout > ", fastestRpcUrl);
  }, 999999);

  it("executing with an rpc timeout", async () => {
    const module = await import("../types/rpc-handler");
    const rpcHandler = new module.RPCHandler({
      ...testConfig,
      rpcTimeout: 1500,
    });
    await rpcHandler.testRpcPerformance();
    const latencies = rpcHandler.getLatencies();

    const slowestRpc = latencies[Object.keys(latencies).sort((a, b) => latencies[b] - latencies[a])[0]];
    const fastestRpcUrl = latencies[Object.keys(latencies).sort((a, b) => latencies[a] - latencies[b])[0]];

    console.log("slowestRpc: with an rpc timeout > ", slowestRpc);
    console.log("fastestRpc: with an rpc timeout > ", fastestRpcUrl);
  }, 999999);
});
