import { JsonRpcProvider } from "@ethersproject/providers";
import { networkRpcs, RPCHandler } from "../dist";
import { HandlerConstructorConfig } from "../types/handler";
import { getRpcUrls, RpcDetailed, RpcType, Tracking } from "../types/shared";

export const testConfig: HandlerConstructorConfig = {
  networkId: 100,
  autoStorage: false,
  cacheRefreshCycles: 3,
  networkName: null,
  networkRpcs: null,
  rpcTimeout: 1500,
  runtimeRpcs: null,
  tracking: "yes",
};

describe("RPCHandler", () => {
  let provider: JsonRpcProvider;
  let rpcHandler: RPCHandler;

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
    rpcHandler = new RPCHandler(testConfig);
  });

  describe("Initialization", () => {
    it("should be instance of RPCHandler", () => {
      expect(rpcHandler).toBeInstanceOf(RPCHandler);
    });
    it("should initialize with correct networkId", () => {
      expect(rpcHandler["_networkId"]).toBe(testConfig.networkId);
    });

    it("should initialize with correct cacheRefreshCycles", () => {
      expect(rpcHandler["_cacheRefreshCycles"]).toBe(testConfig.cacheRefreshCycles);
    });
    it("should initialize with correct autoStorage", () => {
      expect(rpcHandler["_autoStorage"]).toBe(false);
    });
    it("should initialize with correct runtimeRpcs", () => {
      expect(rpcHandler["_runtimeRpcs"]).toEqual([]);
    });
    it("should initialize with correct latencies", () => {
      expect(rpcHandler["_latencies"]).toEqual({});
    });
    it("should initialize with correct networkRpcs", () => {
      expect(rpcHandler["_networkRpcs"]).toEqual(networkRpcs[testConfig.networkId]);
    });
    it("should initialize with null provider", () => {
      const provider = rpcHandler["_provider"];
      expect(provider).toBeNull();
    });

    it("should initialize with correct rpcTimeout", () => {
      expect(rpcHandler["_rpcTimeout"]).toBe(testConfig.rpcTimeout);
    });
  });

  describe("getFastestRpcProvider", () => {
    it("should return the fastest RPC compared to the latencies", async () => {
      await rpcHandler.testRpcPerformance();
      provider = await rpcHandler.getFastestRpcProvider();
      const fastestRpc = rpcHandler.getProvider();
      const latencies = rpcHandler.getLatencies();
      console.log(`latencies: `, latencies);
      console.log(`fastestRpc: `, fastestRpc);
      expect(provider._network.chainId).toBe(testConfig.networkId);
      expect(provider.connection.url).toMatch("https://");
      const latArrLen = Array.from(Object.entries(latencies)).length;
      const runtime = rpcHandler.getRuntimeRpcs();
      expect(runtime.length).toBeGreaterThan(0);

      expect(runtime.length).toBe(latArrLen);
      expect(runtime.length).toBeLessThanOrEqual(getRpcUrls(networkRpcs[testConfig.networkId]).length);

      expect(latArrLen).toBeGreaterThan(1);

      const sorted = Object.entries(latencies).sort((a, b) => a[1] - b[1]);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      expect(first[1]).toBeLessThan(last[1]);
      expect(fastestRpc.connection.url).toBe(provider.connection.url);
    }, 10000);
  });

  describe("RPC tracking config option", () => {
    const filterFunctions = {
      none: function (rpc: RpcType) {
        return typeof rpc != "string" && rpc.tracking == "none";
      },
      limited: function (rpc: RpcType) {
        return typeof rpc != "string" && ["none", "limited"].includes(rpc.tracking);
      },
      yes: function (rpc: RpcType) {
        return true;
      },
      undefined: function (rpc: RpcType) {
        return true;
      },
    };

    for (const [trackingOption, filterFunction] of Object.entries(filterFunctions)) {
      it(`should return correct rpcs with tracking=${trackingOption}`, async () => {
        const filteredRpcs = networkRpcs[testConfig.networkId].filter((rpc) => {
          return filterFunction(rpc);
        });

        const urls = filteredRpcs.map((rpc) => {
          if (typeof rpc == "string") return rpc;

          return (rpc as RpcDetailed).url;
        });

        const rpcHandlerConfig = { ...testConfig };
        if (trackingOption == "undefined") {
          delete rpcHandlerConfig.tracking;
        } else {
          rpcHandlerConfig.tracking = trackingOption as Tracking;
        }
        const handler = new RPCHandler(rpcHandlerConfig);
        await handler.testRpcPerformance();
        const runtime = handler.getRuntimeRpcs();
        expect(runtime.length).toBeLessThanOrEqual(urls.length);

        // expect runtime to be the subset of urls
        expect(urls).toEqual(expect.arrayContaining(runtime));
      }, 10000);
    }
  });
});
