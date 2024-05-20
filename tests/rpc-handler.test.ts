import { JsonRpcProvider } from "@ethersproject/providers";
import { HandlerConstructorConfig, RPCHandler, networkRpcs } from "../dist";

export const testConfig: HandlerConstructorConfig = {
  networkId: 100,
  autoStorage: false,
  cacheRefreshCycles: 3,
  networkName: null,
  networkRpcs: null,
  rpcTimeout: 1500,
  runtimeRpcs: null,
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
      expect(runtime.length).toBeLessThanOrEqual(networkRpcs[testConfig.networkId].length);

      expect(latArrLen).toBeGreaterThan(1);

      const sorted = Object.entries(latencies).sort((a, b) => a[1] - b[1]);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      expect(first[1]).toBeLessThan(last[1]);
      expect(fastestRpc.connection.url).toBe(provider.connection.url);
    }, 10000);
  });
});
