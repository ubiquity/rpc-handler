import { RPCHandler } from "../dist/cjs/src/rpc-handler";
import { testConfig } from "./test-constants";
import { networkRpcs } from "../dist/cjs/src/constants";

describe("RPCHandler", () => {
  const networkId = 1;
  let rpcHandler: RPCHandler;

  beforeEach(() => {
    rpcHandler = new RPCHandler(networkId, testConfig);
  });

  describe("Initialization", () => {
    it("should be instance of RPCHandler", () => {
      expect(rpcHandler).toBeInstanceOf(RPCHandler);
    });

    it("should initialize with correct networkId", () => {
      expect(rpcHandler["_networkId"]).toBe(networkId);
    });

    it(`should initialize with correct env`, () => {
      expect(rpcHandler["_env"]).toBe("node");
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

    it("should initialize with correct networkIds", () => {
      expect(rpcHandler["_networkIds"]).toEqual(testConfig.networkIds);
    });

    it("should initialize with correct tokens", () => {
      expect(rpcHandler["_tokens"]).toEqual(testConfig.tokens);
    });

    it("should initialize with correct networkNames", () => {
      expect(rpcHandler["_networkNames"]).toEqual(testConfig.networkNames);
    });

    it("should initialize with correct networkCurrencies", () => {
      expect(rpcHandler["_networkCurrencies"]).toEqual(testConfig.networkCurrencies);
    });

    it("should initialize with correct networkRpcs", () => {
      expect(rpcHandler["_networkRpcs"]).toEqual(testConfig.networkRpcs);
    });

    it("should initialize with correct networkExplorers", () => {
      expect(rpcHandler["_networkExplorers"]).toEqual(testConfig.networkExplorers);
    });

    it("should initialize with null provider", () => {
      const provider = rpcHandler["_provider"];
      expect(provider).toBeNull();
    });
  });

  describe("getFastestRpcProvider", () => {
    beforeAll(() => {
      jest.setTimeout(30000);
    });

    it("should have a valid connection url", async () => {
      const provider = await rpcHandler.getFastestRpcProvider(networkId);
      expect(provider.connection.url).toMatch(/^http/);
    });

    it("should have correct chainId", async () => {
      const provider = await rpcHandler.getFastestRpcProvider(networkId);
      expect(provider.network.chainId).toBe(networkId);
    });

    it("should return the fastest RPC compared to the latencies", async () => {
      const provider = await rpcHandler.getFastestRpcProvider(networkId);
      const fastestRpc = rpcHandler.findFastestRpc();
      const latencies = rpcHandler.getLatencies();

      const latArrLen = Array.from(Object.entries(latencies)).length;
      let lowest = Number.MAX_SAFE_INTEGER;
      let highest = 0;

      for (const latency of Object.values(latencies)) {
        if (latency < lowest) lowest = latency;
        if (latency > highest) highest = latency;
      }

      expect(rpcHandler.getRuntimeRpcs().length).toBeGreaterThan(1);
      expect(rpcHandler.getRuntimeRpcs().length).toBe(latArrLen);

      expect(latArrLen).toBeGreaterThan(1);
      expect(provider.connection.url).toMatch(fastestRpc);

      expect(lowest).toBeLessThan(highest);
      expect(lowest).toBeGreaterThan(0);
      expect(highest).toBeGreaterThan(0);

      for (const latency of Object.values(latencies)) {
        expect(latency).toBeGreaterThan(0);
      }

      expect(latencies[fastestRpc + `_${networkId}`]).toBe(lowest);
      expect(latencies[fastestRpc + `_${networkId}`]).toEqual(lowest);
      expect(latencies[fastestRpc + `_${networkId}`]).toBeGreaterThan(0);
    });

    it("should have less runtime RPCs than network RPCs", async () => {
      await rpcHandler.getFastestRpcProvider(networkId);

      const runtime = rpcHandler.getRuntimeRpcs();

      expect(runtime).not.toBe(networkRpcs[networkId]);
      expect(runtime.length).toBeLessThan(networkRpcs[networkId].length);
    });
  });

  describe("testRpcPerformance", () => {
    it("should update latencies with correct format", async () => {
      await rpcHandler.testRpcPerformance(networkId);
      const latencies = rpcHandler["_latencies"];

      Object.entries(latencies).forEach(([key, latency]) => {
        expect(key).toContain(`_${networkId}`);
        expect(latency).toBeGreaterThan(0);
      });
    });
  });

  describe("Configuration Updates", () => {
    const newConfig = {
      networkIds: { 1: 56 },
      tokens: { ETH: "Ethereum" },
      networkNames: { 1: "BSC" },
      networkCurrencies: { 1: "BNB" },
      networkRpcs: { 1: ["https://bsc-dataseed.binance.org/"] },
      networkExplorers: { 1: "https://bscscan.com" },
    };

    it("should update network configurations correctly", () => {
      rpcHandler["_updateConfig"](newConfig);

      expect(rpcHandler["_networkIds"]).toEqual(expect.objectContaining(newConfig.networkIds));
      expect(rpcHandler["_tokens"]).toEqual(expect.objectContaining(newConfig.tokens));
      expect(rpcHandler["_networkNames"]).toEqual(expect.objectContaining(newConfig.networkNames));
      expect(rpcHandler["_networkCurrencies"]).toEqual(expect.objectContaining(newConfig.networkCurrencies));
      expect(rpcHandler["_networkRpcs"]).toEqual(expect.objectContaining(newConfig.networkRpcs));
      expect(rpcHandler["_networkExplorers"]).toEqual(expect.objectContaining(newConfig.networkExplorers));
    });
  });
});
