import { JsonRpcProvider } from "@ethersproject/providers";
import { HandlerConstructorConfig } from "../dist/tests/mocks/handler";
import { RPCHandler } from "../dist/tests/mocks/rpc-handler";

export const testConfig: HandlerConstructorConfig = {
  networkId: 1,
  autoStorage: false,
  cacheRefreshCycles: 3,
};
/**
  * RUN #1
  * slowestRpc: without an rpc timeout >  4742.9051
  * fastestRpc: without an rpc timeout >  313.39490000000023
  * slowestRpc: with an rpc timeout >  1338.0906000000004
  * fastestRpc: with an rpc timeout >  49.679700000000594

  * RUN #2
  * slowestRpc: without an rpc timeout >  1030.5119
  * fastestRpc: without an rpc timeout >  256.3906999999999
  * slowestRpc: with an rpc timeout >  857.4552999999996
  * fastestRpc: with an rpc timeout >  38.24900000000025

  * RUN #3
  * slowestRpc: without an rpc timeout >  888.2051999999999
  * fastestRpc: without an rpc timeout >  205.88630000000012
  * slowestRpc: with an rpc timeout >  890.5754999999999
  * fastestRpc: with an rpc timeout >  41.27500000000009
  * 
  * RUN #4
  * slowestRpc: without an rpc timeout >  1809.3851000000004
  * fastestRpc: without an rpc timeout >  259.9160999999999
  * slowestRpc: with an rpc timeout >  1258.1255999999994
  * fastestRpc: with an rpc timeout >  52.10180000000037
  * 
  * RUN #5
  * slowestRpc: without an rpc timeout >  2519.2382999999995
  * fastestRpc: without an rpc timeout >  227.38440000000037
  * slowestRpc: with an rpc timeout >  880.2111000000004
  * fastestRpc: with an rpc timeout >  46.59990000000016
  */

describe("RPCHandler", () => {
  let provider: JsonRpcProvider;
  let rpcHandler: RPCHandler;

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe("benchmark", () => {
    it("executing without an rpc timeout", async () => {
      rpcHandler = new RPCHandler({
        ...testConfig,
        rpcTimeout: 99999999,
      });
      await rpcHandler.testRpcPerformance();
      const latencies = rpcHandler.getLatencies();

      const slowestRpc = latencies[Object.keys(latencies).sort((a, b) => latencies[b] - latencies[a])[0]];
      const fastestRpcUrl = latencies[Object.keys(latencies).sort((a, b) => latencies[a] - latencies[b])[0]];

      console.log("slowestRpc: without an rpc timeout > ", slowestRpc);
      console.log("fastestRpc: without an rpc timeout > ", fastestRpcUrl);
    }, 999999);

    it("executing with an rpc timeout", async () => {
      rpcHandler = new RPCHandler({
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
});
