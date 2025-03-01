import { HandlerConstructorConfig } from "../types/handler";
import nock from "nock";
import { testConfig } from "./constants";

/**
 * I had to separate this into it's own file as `nock` messed
 * up the other tests.
 *
 * I didn't want to test the method like this, but I had to.
 * The consensus function is naturally fragile when it comes
 * to CI.
 */
const rpcUrls = ["http://127.0.0.1:8545", "http://127.0.0.1:8546", "http://127.0.0.1:8547"];
const consensusConfig: HandlerConstructorConfig = {
  ...testConfig,
  runtimeRpcs: rpcUrls,
  networkRpcs: rpcUrls.map((url) => ({ url })),
};

const testPayload = {
  jsonrpc: "2.0",
  method: "eth_getBlockByNumber",
  params: ["latest", false],
  id: 1,
  headers: {
    "Content-Type": "application/json",
  },
};

describe("Consensus Call", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it("Should reach consensus", async () => {
    const module = await import("../types/rpc-handler");
    const rpcHandler = new module.RPCHandler(consensusConfig);

    for (const url of rpcUrls) {
      nock(url)
        .post("/")
        .reply(200, {
          jsonrpc: "2.0",
          result: { number: "0x1b4", hash: "0x1b4" },
          id: 1,
        });
    }

    const consensus = await rpcHandler.security.consensusCall(testPayload, "0.5");
    expect(consensus).toBeDefined();
  }, 15000);

  it("Should fail to reach consensus", async () => {
    const module = await import("../types/rpc-handler");
    const rpcHandler = new module.RPCHandler(consensusConfig);

    const responses = [
      { number: "0x1b4", hash: "0x1b4" },
      { number: "0x01", hash: "0x01" },
      { number: "0x", hash: "0x" },
    ];

    for (const url of rpcUrls) {
      nock(url).post("/").reply(200, {
        jsonrpc: "2.0",
        result: responses.shift(),
        id: 1,
      });
    }
    await expect(rpcHandler.security.consensusCall(testPayload, "0.5")).rejects.toThrow();
  }, 15000);
});
