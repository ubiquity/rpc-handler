import { expect, jest } from "@jest/globals";
import { JsonRpcProvider } from "@ethersproject/providers";
import { HandlerConstructorConfig, RPCHandler, PrettyLogs } from "../dist";

const nonceBitmapData = {
  to: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  data: "0x4fe02b44000000000000000000000000d9530f3fbbea11bed01dc09e79318f2f20223716001fd097bcb5a1759ce02c0a671386a0bbbfa8216559e5855698a9d4de4cddea",
};

const rpcList = ["http://127.0.0.1:8545"];
describe("Logs", () => {
  let handler: RPCHandler;
  let provider: JsonRpcProvider;

  const mods: HandlerConstructorConfig = {
    runtimeRpcs: rpcList,
    networkRpcs: rpcList,
    autoStorage: false,
    cacheRefreshCycles: 1,
    networkName: "local",
    networkId: 31337,
    rpcTimeout: 700,
    proxySettings: {
      retryCount: 1,
      retryDelay: 10,
      logTier: "ok",
      logger: new PrettyLogs(),
      strictLogs: true,
    },
  };

  afterAll(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.resetAllMocks();
    jest.resetModules();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.resetAllMocks();
    jest.resetModules();
  });

  it("should log only 'ok' tiered logs", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    handler = new RPCHandler({ ...mods, proxySettings: { ...mods.proxySettings, logTier: "ok" } });
    provider = await handler.getFastestRpcProvider();
    try {
      const response = await provider.send("eth_blockNumber", []);
      expect(response).toBeDefined();
      expect(parseInt(response)).toBeGreaterThan(0);
      expect(consoleSpy).toBeCalledTimes(1);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(Error);
      console.log(error);
    }
  });

  it("should log only 'info' tiered logs", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    handler = new RPCHandler({ ...mods, proxySettings: { ...mods.proxySettings, logTier: "info" } });
    provider = await handler.getFastestRpcProvider();
    try {
      const response = await provider.send("eth_blockNumber", []);
      expect(response).toBeDefined();
      expect(parseInt(response)).toBeGreaterThan(0);
      expect(consoleSpy).toBeCalledTimes(2);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(Error);
    }
  });

  it("should log only 'warn' tiered logs", async () => {
    const consoleSpy = jest.spyOn(console, "error");
    handler = new RPCHandler({ ...mods, proxySettings: { ...mods.proxySettings, logTier: "error" } });
    provider = await handler.getFastestRpcProvider();
    try {
      const response = await provider.send("eth_blockNumber", []);
      expect(response).toBeDefined();
      expect(parseInt(response)).toBeGreaterThan(0);
      expect(consoleSpy).toBeCalledTimes(2);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(Error);
    }
  });

  it("should log only 'fatal' tiered logs", async () => {
    const consoleSpy = jest.spyOn(console, "error");
    handler = new RPCHandler({ ...mods, proxySettings: { ...mods.proxySettings, logTier: "fatal" } });
    provider = await handler.getFastestRpcProvider();
    try {
      const response = await provider.send("eth_blockNumber", []);
      expect(response).toBeDefined();
      expect(parseInt(response)).toBeGreaterThan(0);
      expect(consoleSpy).toBeCalledTimes(1);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(Error);
    }
  });

  it("should log all logs when 'verbose'", async () => {
    const logSpy = jest.spyOn(console, "log");
    const errorSpy = jest.spyOn(console, "error");
    handler = new RPCHandler({ ...mods, proxySettings: { ...mods.proxySettings, logTier: "verbose" } });
    provider = await handler.getFastestRpcProvider();
    try {
      const response = await provider.send("eth_blockNumber", []);
      expect(response).toBeDefined();
      expect(parseInt(response)).toBeGreaterThan(0);
      expect(logSpy).toBeCalledTimes(3);
      expect(errorSpy).toBeCalledTimes(1);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(Error);
      expect(logSpy).toBeCalledTimes(1);
    }
  });

  it("should log all logs when 'strictLogs == false' regardless of tier", async () => {
    const logSpy = jest.spyOn(console, "log");
    const errorSpy = jest.spyOn(console, "error");
    handler = new RPCHandler({ ...mods, proxySettings: { ...mods.proxySettings, strictLogs: false, logTier: "info" } });
    provider = await handler.getFastestRpcProvider();

    try {
      const response = await provider.send("eth_blockNumber", []);
      expect(response).toBeDefined();
      expect(parseInt(response)).toBeGreaterThan(0);
      expect(logSpy).toBeCalledTimes(3);
      expect(errorSpy).toBeCalledTimes(1);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(Error);
      expect(logSpy).toBeCalledTimes(1);
    }
  });

  it("should have multiple logs when retrying failed requests", async () => {
    const logSpy = jest.spyOn(console, "log");
    const errorSpy = jest.spyOn(console, "error");

    const badRpcs = ["http://127.0.0.1:8546", "http://127.0.0.1:8544", "http://127.0.0.1:8545"];

    handler = new RPCHandler({ ...mods, networkRpcs: badRpcs, proxySettings: { ...mods.proxySettings, strictLogs: false, retryCount: 3, retryDelay: 20 } });
    provider = await handler.getFastestRpcProvider();

    try {
      const response = await provider.send("eth_call", [nonceBitmapData, "latest"]);
      expect(response).toBeDefined();
      expect(response).toBe("0x" + "00".repeat(32));
      expect(logSpy).toBeCalledTimes(9);
      expect(errorSpy).toBeCalledTimes(6);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(Error);
      expect(logSpy).toBeCalledTimes(1);
    }
  });
});
