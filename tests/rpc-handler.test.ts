import { JsonRpcProvider } from "@ethersproject/providers";
import { networkRpcs } from "../types/constants";
// import { RPCHandler } from "../types/rpc-handler";
import { HandlerConstructorConfig, getRpcUrls, Rpc, Tracking } from "../types/handler";
import { PrettyLogs } from "../types/logs";

export const testConfig: HandlerConstructorConfig = {
  networkId: "100",
  autoStorage: false,
  cacheRefreshCycles: 3,
  networkName: null,
  networkRpcs: null,
  rpcTimeout: 600,
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

describe.only("RPCHandler", () => {
  let provider: JsonRpcProvider;

  afterAll(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.resetAllMocks();
    jest.resetModules();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.resetAllMocks();
    jest.resetModules();
  });

  // describe("Initialization", () => {
  //   let rpcHandler: RPCHandler;
  //   beforeEach(async () => {
  //     rpcHandler = new RPCHandler(testConfig);
  //   });
  //
  //   it("should be instance of RPCHandler", () => {
  //     expect(rpcHandler).toBeInstanceOf(RPCHandler);
  //   });
  //   it("should initialize with correct networkId", () => {
  //     expect(rpcHandler["_networkId"]).toBe(testConfig.networkId);
  //   });
  //
  //   it("should initialize with correct cacheRefreshCycles", () => {
  //     expect(rpcHandler["_cacheRefreshCycles"]).toBe(testConfig.cacheRefreshCycles);
  //   });
  //   it("should initialize with correct autoStorage", () => {
  //     expect(rpcHandler["_autoStorage"]).toBe(false);
  //   });
  //   it("should initialize with correct runtimeRpcs", () => {
  //     expect(rpcHandler["_runtimeRpcs"]).toEqual([]);
  //   });
  //   it("should initialize with correct latencies", () => {
  //     expect(rpcHandler["_latencies"]).toEqual({});
  //   });
  //   it("should initialize with correct networkRpcs", () => {
  //     expect(rpcHandler["_networkRpcs"]).toEqual(networkRpcs[testConfig.networkId].rpcs);
  //   });
  //   it("should initialize with null provider", () => {
  //     const provider = rpcHandler["_provider"];
  //     expect(provider).toBeNull();
  //   });
  //
  //   it("should initialize with correct rpcTimeout", () => {
  //     expect(rpcHandler["_rpcTimeout"]).toBe(testConfig.rpcTimeout);
  //   });
  // });

  describe.only("getFastestRpcProvider", () => {
    it.only("should return the fastest RPC compared to the latencies", async () => {
      const module = await import("../types/rpc-handler");
      const rpcHandler = new module.RPCHandler({
        ...testConfig,
        rpcTimeout: 99999999,
      });

      provider = await rpcHandler.getFastestRpcProvider();
      const fastestRpc = rpcHandler.getProvider();
      const latencies = rpcHandler.getLatencies();
      expect(provider._network.chainId).toBe(Number(testConfig.networkId));
      expect(provider.connection.url).toMatch(/(https|wss):\/\//);
      const latArrLen = Array.from(Object.entries(latencies)).length;
      const runtime = rpcHandler.getRuntimeRpcs();
      expect(runtime.length).toBeGreaterThan(0);
      expect(runtime.length).toBe(latArrLen);
      expect(runtime.length).toBeLessThanOrEqual(getRpcUrls(networkRpcs[testConfig.networkId].rpcs).length);
      expect(latArrLen).toBeGreaterThanOrEqual(1);

      if (latArrLen > 1) {
        const sorted = Object.entries(latencies).sort((a, b) => a[1] - b[1]);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        expect(first[1]).toBeLessThanOrEqual(last[1]);
      }
      expect(fastestRpc.connection.url).toBe(provider.connection.url);
    }, 360000);
  });

  // describe("RPC tracking config option", () => {
  //   const filterFunctions = {
  //     none: function (rpc: Rpc) {
  //       return rpc?.tracking && rpc.tracking == "none";
  //     },
  //     limited: function (rpc: Rpc) {
  //       return rpc?.tracking && ["none", "limited"].includes(rpc.tracking);
  //     },
  //     yes: function (rpc: Rpc) {
  //       return true;
  //     },
  //     undefined: function (rpc: Rpc) {
  //       return true;
  //     },
  //   };
  //
  //   for (const [trackingOption, filterFunction] of Object.entries(filterFunctions)) {
  //     it(`should return correct rpcs with tracking=${trackingOption}`, async () => {
  //       const filteredRpcs = networkRpcs[testConfig.networkId].rpcs.filter((rpc) => {
  //         return filterFunction(rpc);
  //       });
  //
  //       const urls = filteredRpcs.map((rpc) => {
  //         if (typeof rpc == "string") return rpc;
  //
  //         return rpc.url;
  //       });
  //
  //       const rpcHandlerConfig = { ...testConfig };
  //       if (trackingOption == "undefined") {
  //         delete rpcHandlerConfig.tracking;
  //       } else {
  //         rpcHandlerConfig.tracking = trackingOption as Tracking;
  //       }
  //       const handler = new RPCHandler(rpcHandlerConfig);
  //       await handler.testRpcPerformance();
  //       const runtime = handler.getRuntimeRpcs();
  //       expect(runtime.length).toBeLessThanOrEqual(urls.length);
  //
  //       // expect runtime to be the subset of urls
  //       expect(urls).toEqual(expect.arrayContaining(runtime));
  //     }, 10000);
  //   }
  // });
});
