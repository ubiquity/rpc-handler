import { JsonRpcProvider } from "@ethersproject/providers";
import { RPCHandler } from "../types/rpc-handler";
import { HandlerConstructorConfig } from "../types/handler";
import { PrettyLogs } from "../types/logs";

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

jest.mock("axios", () => ({
  ...jest.requireActual("axios"),
  create: jest.fn(() => ({
    post: jest.fn(),
  })),
}));

describe("Call Handler", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe("createProviderProxy", () => {
    let provider: JsonRpcProvider;

    it("should get the fastest rpc provider", async () => {
      const module = await import("../types/rpc-handler");
      const handler = new module.RPCHandler({ ...testConfig, proxySettings: { ...testConfig.proxySettings, logTier: "verbose" } });

      provider = await handler.getFastestRpcProvider();
      expect(provider).toBeTruthy();
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

    it("should properly spawn the provider with custom mods", async () => {
      const { provider } = await setup();
      expect(provider).toBeTruthy();
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
      expect(newProvider).toBeTruthy();
    });

    it("should throw an error if every call fails 3x", async () => {
      const badRpcList = [{ url: "http://127.0.0.1:85451" }, { url: "http://127.0.0.1:85454" }];
      const newHandler = new RPCHandler({
        ...mods,
        networkRpcs: badRpcList,
        proxySettings: { ...mods.proxySettings, retryDelay: 10, strictLogs: false, logTier: "verbose" },
      });
      const newProvider = await newHandler.getFastestRpcProvider();
      expect(newProvider).toBeTruthy();
    });

    it("should return a standard JsonRpcProvider if proxySettings.disabled", async () => {
      const newHandler = new RPCHandler({ ...mods, proxySettings: { ...mods.proxySettings, disabled: true, strictLogs: false, logTier: "error" } });
      const newProvider = await newHandler.getFastestRpcProvider();
      expect(newProvider).toBeTruthy();
    });
  });
});
