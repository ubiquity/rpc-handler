import { RPCHandler } from "../types/rpc-handler";
import { HandlerConstructorConfig } from "../types/handler";
import { PrettyLogs } from "../types/logs";

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

    afterAll(() => {
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
