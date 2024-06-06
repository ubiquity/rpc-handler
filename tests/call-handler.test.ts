import { expect, jest } from "@jest/globals";
import { JsonRpcProvider } from "@ethersproject/providers";
import { HandlerConstructorConfig, RPCHandler, networkRpcs, PrettyLogs } from "../dist";
import { testConfig } from "./rpc-handler.test";

type AppState = {
  provider: JsonRpcProvider;
  handler: RPCHandler;
};

const nonceBitmapData = {
  to: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  data: "0x4fe02b44000000000000000000000000d9530f3fbbea11bed01dc09e79318f2f20223716001fd097bcb5a1759ce02c0a671386a0bbbfa8216559e5855698a9d4de4cddea",
  accessList: null,
};

describe.only("createProviderProxy", () => {
  let provider: JsonRpcProvider;
  const handler: RPCHandler = new RPCHandler(testConfig);

  beforeEach(async () => {
    provider = await handler.getFastestRpcProvider();
  });

  it("should make a successful get_blockNumber call", async () => {
    const blockNumber = await provider.getBlockNumber();
    expect(blockNumber).toBeGreaterThan(0);
  });

  it("should make a successful eth_call", async () => {
    let calls = 0;
    const maxCalls = 50;

    while (calls < maxCalls) {
      provider = await handler.getFastestRpcProvider();
      const call = nonceBitmapEthCall(provider.connection.url);
      const response = await call;
      if (response) {
        expect(response).toBeDefined();
        expect(response).toBe("0x0000000000000000000000000000000000000000000000000000000000000000");
        break;
      }
      calls++;
    }
  });
});

describe("Failure cases", () => {
  let appState: Partial<AppState>;
  let provider: JsonRpcProvider;
  let handler: RPCHandler;
  const txHashRegex = new RegExp("0x[0-9a-f]{64}");

  const rpcList = [
    "http://localhost:85451",
    "http://localhost:85454",
    "http://localhost:85453",
    "http://localhost:854531",
    "http://localhost:854532",
    "http://localhost:854533",
    "http://localhost:854535",
    "http://localhost:854",
    "http://localhost:85",
    "http://localhost:81",
    "http://localhost:8545",
  ];

  const mods = {
    runtimeRpcs: rpcList,
    networkRpcs: rpcList,
  } as Partial<HandlerConstructorConfig>;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new RPCHandler({ ...testConfig, ...mods });
  });

  it("should allow an invalidate nonce call to go through", async () => {
    const txData = {
      gas: "0xb371",
      from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      to: "0x000000000022d473030f116ddee9f6b43ac78ba3",
      data: "0x3ff9dcb100cb6493ae939f58e9e22aa5aadb604ea085eedb2ed3784fb6f0f912805f2abc0000000000000000000000000000000000000000000000000000000002000000",
    };

    const txHash = await provider.send("eth_sendTransaction", [txData]);
    expect(txHash).toBeDefined();
    expect(txHash).toMatch(txHashRegex);
  });

  it("should allow a claim call to go through", async () => {
    const txData = {
      gas: "0x1f4f8",
      from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      to: "0x000000000022d473030f116ddee9f6b43ac78ba3",
      data: "0x4fe02b4400000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c800d2429b6ec3b99c749d9629667197d4af1dd7ab825c27adf3477c79e9e5ac22",
    };

    const txHash = await provider.send("eth_sendTransaction", [txData]);
    expect(txHash).toBeDefined();
    expect(txHash).toMatch(txHashRegex);
  });

  it("should make 3 bad calls and then a successful call", async () => {
    const consoleSpy = jest.spyOn(console, "error");

    try {
      await provider.getBlockNumber();
    } catch (er) {
      console.log(er);
    }
    expect(consoleSpy).toHaveBeenCalledTimes(3);
  });

  it("should make the very last call should succeed", async () => {
    const consoleSpy = jest.spyOn(console, "error");

    try {
      await provider.getBlockNumber();
    } catch (er) {
      console.log(er);
    }

    it("should throw an error if every call fails 3x", async () => {
      let thrownError: Error | unknown = null;
      try {
        await provider.getBlockNumber();
      } catch (er) {
        console.log(er);
        thrownError = er;
      }
    });
  });
});

// only works with a valid rpc or it throws an error unrelated to app logic
async function nonceBitmapEthCall(rpc: string) {
  return reqMaker(rpc, "eth_call", [nonceBitmapData, "latest"]);
}

function reqMaker(rpc: string, method: string, params: unknown[]) {
  return fetch(rpc, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });
}
