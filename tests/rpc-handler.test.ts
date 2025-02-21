import { JsonRpcProvider } from "@ethersproject/providers";
import { networkRpcs } from "../types/constants";
import { RPCHandler } from "../types/rpc-handler";
import { HandlerConstructorConfig, getRpcUrls, Rpc, Tracking } from "../types/handler";
import { PrettyLogs } from "../types/logs";

const rpcList: { url: string; tracking?: Tracking }[] = [
  { url: "http://127.0.0.1:85451", tracking: "none" },
  { url: "http://127.0.0.1:85454", tracking: "none" },
  { url: "http://127.0.0.1:85453", tracking: "none" },
  { url: "http://127.0.0.1:854531", tracking: "none" },
  { url: "http://127.0.0.1:854532", tracking: "none" },
  { url: "http://127.0.0.1:854533", tracking: "none" },
  { url: "http://127.0.0.1:854535", tracking: "none" },
  { url: "http://127.0.0.1:854", tracking: "none" },
  { url: "http://127.0.0.1:85", tracking: "none" },
  { url: "http://127.0.0.1:81", tracking: "none" },
  { url: "http://127.0.0.1:8545", tracking: "none" },
];

export const testConfig: HandlerConstructorConfig = {
  networkName: "anvil",
  networkId: "31337",
  runtimeRpcs: rpcList.map((rpc) => rpc.url),
  networkRpcs: rpcList,
  autoStorage: false,
  cacheRefreshCycles: 3,
  rpcTimeout: 600,
  tracking: "yes",
  exclusions: null,
  proxySettings: {
    retryCount: 3,
    retryDelay: 10,
    logTier: "info",
    logger: new PrettyLogs(),
    strictLogs: true,
  },
};

describe("RPCHandler", () => {
  let provider: JsonRpcProvider;

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe("Initialization", () => {
    function setup() {
      return new RPCHandler(testConfig);
    }

    it("should be instance of RPCHandler", () => {
      const rpcHandler = setup();
      expect(rpcHandler).toBeInstanceOf(RPCHandler);
    });

    it("should initialize with correct networkId", () => {
      const rpcHandler = setup();
      expect(rpcHandler["_networkId"]).toBe(testConfig.networkId);
    });

    it("should initialize with correct cacheRefreshCycles", () => {
      const rpcHandler = setup();
      expect(rpcHandler["_cacheRefreshCycles"]).toBe(testConfig.cacheRefreshCycles);
    });

    it("should initialize with correct autoStorage", () => {
      const rpcHandler = setup();
      expect(rpcHandler["_autoStorage"]).toBe(false);
    });

    it("should initialize with correct runtimeRpcs", () => {
      const rpcHandler = setup();
      expect(rpcHandler["_runtimeRpcs"]).toEqual([
        "http://127.0.0.1:8545",
        "http://127.0.0.1:8546",
        "http://127.0.0.1:85451",
        "http://127.0.0.1:85454",
        "http://127.0.0.1:85453",
        "http://127.0.0.1:854531",
        "http://127.0.0.1:854532",
        "http://127.0.0.1:854533",
        "http://127.0.0.1:854535",
        "http://127.0.0.1:854",
        "http://127.0.0.1:85",
        "http://127.0.0.1:81",
        "http://127.0.0.1:8545",
      ]);
    });

    it("should initialize with correct latencies", () => {
      const rpcHandler = setup();
      expect(rpcHandler["_latencies"]).toEqual({});
    });

    it("should initialize with correct networkRpcs", () => {
      const rpcHandler = setup();
      expect(rpcHandler["_networkRpcs"]).toEqual([
        {
          url: "http://127.0.0.1:8545",
        },
        {
          url: "http://127.0.0.1:8546",
        },
      ]);
    });

    it("should initialize with null provider", () => {
      const rpcHandler = setup();
      const provider = rpcHandler["_provider"];
      expect(provider).toBeNull();
    });

    it("should initialize with correct rpcTimeout", () => {
      const rpcHandler = setup();
      expect(rpcHandler["_rpcTimeout"]).toBe(testConfig.rpcTimeout);
    });
  });

  describe("getFastestRpcProvider", () => {
    it("should return the fastest RPC compared to the latencies", async () => {
      const module = await import("../types/rpc-handler");
      const rpcHandler = new module.RPCHandler({
        ...testConfig,
        rpcTimeout: 10000,
      });

      provider = await rpcHandler.getFastestRpcProvider();
      const fastestRpc = rpcHandler.getProvider();
      const latencies = rpcHandler.getLatencies();
      expect(provider._network.chainId).toBe(Number(testConfig.networkId));
      expect(provider.connection.url).toMatch(/(https|wss|http):\/\//);
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

  describe("RPC tracking config option", () => {
    const filterFunctions = {
      none: function (rpc: Rpc) {
        return rpc?.tracking && rpc.tracking === "none";
      },
      limited: function (rpc: Rpc) {
        return rpc?.tracking && ["none", "limited"].includes(rpc.tracking);
      },
      yes: function (rpc: Rpc) {
        return true;
      },
      undefined: function (rpc: Rpc) {
        return true;
      },
    };

    for (const [trackingOption, filterFunction] of Object.entries(filterFunctions)) {
      it(`should return correct rpcs with tracking=${trackingOption}`, async () => {
        const filteredRpcs = rpcList.filter((rpc) => {
          return filterFunction(rpc);
        });

        const urls = filteredRpcs.map((rpc) => {
          if (typeof rpc == "string") return rpc;

          return rpc.url;
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

  it("Should return the first available RPC", async () => {
    const module = await import("../types/rpc-handler");
    const rpcHandler = new module.RPCHandler({
      ...testConfig,
      networkId: "1",
      rpcTimeout: 1000,
    });

    const provider = await rpcHandler.getFirstAvailableRpcProvider();
    expect(provider).not.toBeNull();
  });
});
