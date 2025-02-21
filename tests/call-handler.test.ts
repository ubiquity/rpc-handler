import { HandlerConstructorConfig } from "../types/handler";
import { PrettyLogs } from "../types/logs";
import { RPCHandler } from "../types/rpc-handler";

export const testConfig: HandlerConstructorConfig = {
  networkId: "100",
  autoStorage: false,
  cacheRefreshCycles: 3,
  networkName: null,
  networkRpcs: null,
  rpcTimeout: 600,
  runtimeRpcs: null,
  exclusions: null,
  proxySettings: {
    retryCount: 3,
    retryDelay: 10,
    logTier: "info",
    logger: new PrettyLogs(),
    strictLogs: true,
  },
};

const rpcList = [
  { url: "http://127.0.0.1:85451" },
  { url: "http://127.0.0.1:85454" },
  { url: "http://127.0.0.1:85453" },
  { url: "http://127.0.0.1:854531" },
  { url: "http://127.0.0.1:854532" },
  { url: "http://127.0.0.1:854533" },
  { url: "http://127.0.0.1:854535" },
  { url: "http://127.0.0.1:854" },
  { url: "http://127.0.0.1:85" },
  { url: "http://127.0.0.1:81" },
  { url: "http://127.0.0.1:8545" },
];

const nonceBitmapData = {
  to: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  data: "0x4fe02b44000000000000000000000000d9530f3fbbea11bed01dc09e79318f2f20223716001fd097bcb5a1759ce02c0a671386a0bbbfa8216559e5855698a9d4de4cddea",
};

const txHashRegex = new RegExp("0x[0-9a-f]{64}");

describe("Call Handler", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe("createProviderProxy", () => {
    it("should make a successful get_blockNumber call", async () => {
      const module = await import("../types/rpc-handler");
      const handler = new module.RPCHandler({
        ...testConfig,
        proxySettings: { ...testConfig.proxySettings, logTier: "verbose" },
        runtimeRpcs: rpcList.map((rpc) => rpc.url),
        networkRpcs: rpcList,
        networkName: "anvil",
        networkId: "31337",
      });

      const provider = await handler.getFastestRpcProvider();
      const blockNumber = await provider.send("eth_blockNumber", []);
      expect(parseInt(blockNumber)).toBeGreaterThan(0);
    }, 15000);

    it("should get the fastest rpc provider", async () => {
      const module = await import("../types/rpc-handler");
      const handler = new module.RPCHandler({
        ...testConfig,
        proxySettings: { ...testConfig.proxySettings, logTier: "verbose" },
        runtimeRpcs: rpcList.map((rpc) => rpc.url),
        networkRpcs: rpcList,
        networkName: "anvil",
        networkId: "31337",
      });

      const provider = await handler.getFastestRpcProvider();
      const response = await provider.send("eth_call", [nonceBitmapData, "latest"]);
      expect(response).toBeDefined();
      expect(response).toBe("0x" + "00".repeat(32));
    }, 15000);
  });

  describe("Write ops cases", () => {
    const mods: HandlerConstructorConfig = {
      runtimeRpcs: rpcList.map((rpc) => rpc.url),
      networkRpcs: rpcList,
      autoStorage: false,
      cacheRefreshCycles: 1,
      networkName: "anvil",
      networkId: "31337",
      rpcTimeout: 700,
      exclusions: null,
      proxySettings: {
        retryCount: 1,
        retryDelay: 10,
        logTier: "verbose",
        logger: new PrettyLogs(),
        strictLogs: false,
      },
    };

    async function setup() {
      const handler = new RPCHandler(mods);
      const provider = await handler.getFastestRpcProvider();
      return { handler, provider };
    }

    afterEach(async () => {
      jest.clearAllMocks();
      jest.clearAllTimers();
    });

    it("should allow an invalidate nonce call to go through", async () => {
      const txData = {
        gas: "0xb371",
        from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        to: "0x000000000022d473030f116ddee9f6b43ac78ba3",
        data: "0x3ff9dcb100cb6493ae939f58e9e22aa5aadb604ea085eedb2ed3784fb6f0f912805f2abc0000000000000000000000000000000000000000000000000000000002000000",
      };
      const { provider } = await setup();
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

      const { provider } = await setup();
      const txHash = await provider.send("eth_sendTransaction", [txData]);
      expect(txHash).toBeDefined();
      expect(txHash).toMatch(txHashRegex);
    });
  });

  describe("Failure cases", () => {
    const mods: HandlerConstructorConfig = {
      runtimeRpcs: null,
      networkRpcs: null,
      autoStorage: false,
      cacheRefreshCycles: 1,
      networkName: "anvil",
      networkId: "31337",
      rpcTimeout: 700,
      exclusions: null,
      proxySettings: {
        retryCount: 1,
        retryDelay: 10,
        logTier: "verbose",
        logger: new PrettyLogs(),
        strictLogs: false,
      },
    };

    afterEach(() => {
      jest.clearAllMocks();
      jest.clearAllTimers();
    });

    it("should be able to filter all bad rpcs then make a successful call", async () => {
      const badRpcList = [{ url: "http://127.0.0.1:85451" }, { url: "http://127.0.0.1:85454" }, { url: "http://127.0.0.1:8545" }];
      mods.networkRpcs = badRpcList;

      const newHandler = new RPCHandler(mods);
      newHandler["_networkRpcs"] = badRpcList;
      const newProvider = await newHandler.getFastestRpcProvider();
      await newProvider.getBlockNumber();

      expect(newHandler["_runtimeRpcs"].length).toBe(1);
      expect(newHandler["_runtimeRpcs"][0]).toBe("http://127.0.0.1:8545");
      expect(newProvider).toBeTruthy();
    });

    it("should throw an error if every call fails 3x", async () => {
      const badRpcList = [{ url: "http://127.0.0.1:85451" }, { url: "http://127.0.0.1:85454" }];
      const newHandler = new RPCHandler({
        ...mods,
        networkRpcs: badRpcList,
        proxySettings: { ...mods.proxySettings, retryDelay: 10, strictLogs: false, logTier: "verbose" },
      });

      let thrownError: Error | unknown = null;

      try {
        const newProvider = await newHandler.getFastestRpcProvider();
        await newProvider.send("eth_call", [null, null, null]);
      } catch (er) {
        thrownError = er;
      }

      expect(thrownError).toBeInstanceOf(Error);
      expect((thrownError as Error).message).toContain("invalid type: null");
      expect(newHandler["_runtimeRpcs"].length).toBe(1);
      expect(newHandler["_runtimeRpcs"][0]).toBe("http://127.0.0.1:8545");
    });

    it("should return a standard JsonRpcProvider if proxySettings.disabled", async () => {
      const newHandler = new RPCHandler({ ...mods, proxySettings: { ...mods.proxySettings, disabled: true, strictLogs: false, logTier: "error" } });
      const newProvider = await newHandler.getFastestRpcProvider();
      const txData = {
        gas: "0x1f4f8",
        from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        to: "0x000000000022d473030f116ddee9f6b43ac78ba3",
        data: "0x4fe02b4400000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c800d2429b6ec3b99c749d9629667197d4af1dd7ab825c27adf3477c79e9e5ac22",
      };
      const txHash = await newProvider.send("eth_sendTransaction", [txData]);

      expect(txHash).toBeDefined();
      expect(txHash).toMatch(txHashRegex);

      let thrownError: Error | unknown = null;

      try {
        await newProvider.send("eth_call", [null, null, null]);
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(Error);
      expect((thrownError as Error).message).toContain("invalid type: null");
    });
  });
});
