import { HandlerConstructorConfig } from "../types/handler";
import { PrettyLogs } from "../types/logs";
import nock from "nock";

/**
 * I had to separate this into ait'#s own file as `nock` messed
 * up the other tests.
 */

export const testConfig: HandlerConstructorConfig = {
  networkId: "100",
  autoStorage: false,
  cacheRefreshCycles: 3,
  networkName: null,
  networkRpcs: null,
  rpcTimeout: 600,
  runtimeRpcs: null,
  proxySettings: {
    retryCount: 3,
    retryDelay: 10,
    logTier: "info",
    logger: new PrettyLogs(),
    strictLogs: true,
  },
};

describe("Consensus Call", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it("Should reach consensus", async () => {
    const module = await import("../types/rpc-handler");
    const rpcUrls = ["http://127.0.0.1:8545", "http://127.0.0.1:8546", "http://127.0.0.1:8547"];
    const rpcHandler = new module.RPCHandler({
      ...testConfig,
      proxySettings: { ...testConfig.proxySettings, logTier: "verbose" },
      rpcTimeout: 10000,
      networkId: "100",
      runtimeRpcs: rpcUrls,
      networkRpcs: rpcUrls.map((url) => ({ url })),
    });

    /**
     * I didn't want to do this, but I had to. The consensus function is naturally fragile
     * when it comes to CI environments.
     */

    nock(rpcUrls[0])
      .post("/")
      .reply(200, {
        jsonrpc: "2.0",
        result: { number: "0x1b4", hash: "0x1b4" },
        id: 1,
      });

    nock(rpcUrls[1])
      .post("/")
      .reply(200, {
        jsonrpc: "2.0",
        result: { number: "0x1b4", hash: "0x1b4" },
        id: 1,
      });

    nock(rpcUrls[2])
      .post("/")
      .reply(200, {
        jsonrpc: "2.0",
        result: { number: "0x1b4", hash: "0x1b4" },
        id: 1,
      });

    const consensus = await rpcHandler.consensusCall(
      {
        jsonrpc: "2.0",
        method: "eth_getBlockByNumber",
        params: ["latest", false],
        id: 1,
        headers: {
          "Content-Type": "application/json",
        },
      },
      "0.5"
    );

    expect(consensus).toBeDefined();
  }, 15000);
});
