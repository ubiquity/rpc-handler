import { expect, jest } from "@jest/globals";
import { JsonRpcProvider } from "@ethersproject/providers";
import { HandlerConstructorConfig, RPCHandler, PrettyLogs, LOCAL_HOST } from "../dist";

const nonceBitmapData = {
  to: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  data: "0x4fe02b44000000000000000000000000d9530f3fbbea11bed01dc09e79318f2f20223716001fd097bcb5a1759ce02c0a671386a0bbbfa8216559e5855698a9d4de4cddea",
};

const rpcList = [LOCAL_HOST];
const ansiEscapeCodes = /\x1b\[\d+m|\s/g;

const INITIALIZED = `✓[RPCHandler] Provider initialized: {"provider": "http://127.0.0.1:8545" }`;
const BLOCK_NUMBER_CALL = `💬[RPCHandler] Successfully called provider method send ${JSON.stringify({
  method: "send",
  args: ["eth_blockNumber", []],
  metadata: {
    rpc: "http://127.0.0.1:8545",
  },
})}`;
const DEBUG_RETRY_IN_20 = `›› [RPCHandler] Retrying in 20ms...`;
const DEBUG_CALL_NUMBER = `›› [RPCHandler] Call number: `;
const DEBUG_CONNECT_TO = `›› [RPCHandler] Connected to: 31337__http://127.0.0.1:8545`;
const DEBUG_RETRY = `›› [RPCHandler] Current provider failed, retrying with next fastest provider... ${JSON.stringify({
  method: "send",
  args: ["eth_call", [null, null, null, "latest"]],
})}`;
const NULL_ARG_TX_CALL = `×${JSON.stringify({
  error: {
    reason: "processing response error",
    code: "SERVER_ERROR",
    body: '{"jsonrpc":"2.0","id":42,"error":{"code":-32602,"message":"invalid type: null, expected struct WithOtherFieldsHelper"}}',
    error: {
      code: -32602,
    },
    requestBody: '{"method":"eth_call","params":[null,null,null,"latest"],"id":42,"jsonrpc":"2.0"}',
    requestMethod: "POST",
    url: "http://127.0.0.1:8545",
  },
  method: "send",
  args: ["eth_call", [null, null, null, "latest"]],
})}`;
const NULL_ARG_TX_CALL_RETRY = `⚠${JSON.stringify({
  error: {
    reason: "processing response error",
    code: "SERVER_ERROR",
    body: '{"jsonrpc":"2.0","id":42,"error":{"code":-32602,"message":"invalid type: null, expected struct WithOtherFieldsHelper"}}',
    error: {
      code: -32602,
    },
    requestBody: '{"method":"eth_call","params":[null,null,null,"latest"],"id":42,"jsonrpc":"2.0"}',
    requestMethod: "POST",
    url: "http://127.0.0.1:8545",
  },
  method: "send",
  args: ["eth_call", [null, null, null, "latest"]],
  metadata: {
    rpc: "http://127.0.0.1:8545",
  },
})}`;

const NONCE_BITMAP_ETH_CALL = `💬 [RPCHandler] Successfully called provider method send ${JSON.stringify({
  method: "send",
  args: [
    "eth_call",
    [
      {
        to: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
        data: "0x4fe02b44000000000000000000000000d9530f3fbbea11bed01dc09e79318f2f20223716001fd097bcb5a1759ce02c0a671386a0bbbfa8216559e5855698a9d4de4cddea",
      },
      "latest",
    ],
  ],
  metadata: {
    rpc: "http://127.0.0.1:8545",
  },
})}`;

describe("Logs", () => {
  let handler: RPCHandler;
  let provider: JsonRpcProvider;

  const mods: HandlerConstructorConfig = {
    runtimeRpcs: rpcList,
    networkRpcs: rpcList,
    autoStorage: false,
    cacheRefreshCycles: 1,
    networkName: "anvil",
    networkId: "31337",
    rpcTimeout: 700,
    proxySettings: {
      retryCount: 3,
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
    const logSpy = jest.spyOn(console, "log");
    const errorSpy = jest.spyOn(console, "error");
    const debugSpy = jest.spyOn(console, "debug");
    const warnSpy = jest.spyOn(console, "warn");

    handler = new RPCHandler({ ...mods, proxySettings: { ...mods.proxySettings, logTier: "ok" } });
    provider = await handler.getFastestRpcProvider();
    const blockNumberResponse = await provider.send("eth_blockNumber", []);
    expect(blockNumberResponse).toBeDefined();
    expect(parseInt(blockNumberResponse)).toBeGreaterThan(0);

    try {
      const response = await provider.send("eth_call", [null, null, null, "latest"]);
      expect(response).toBeDefined();
    } catch (er) {
      expect(er).toBeDefined();
      expect(er).toBeInstanceOf(Error);
    }

    expect(logSpy).toBeCalledTimes(1);
    expect(errorSpy).toBeCalledTimes(0);
    expect(debugSpy).toBeCalledTimes(0);
    expect(warnSpy).toBeCalledTimes(0);

    const cleanLogStrings = cleanSpyLogs(logSpy);
    expect(cleanLogStrings).toEqual(expect.arrayContaining([cleanLogString(INITIALIZED)]));
  });

  it("should log only 'info' tiered logs", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    const errorSpy = jest.spyOn(console, "error");
    const debugSpy = jest.spyOn(console, "debug");
    const warnSpy = jest.spyOn(console, "warn");
    const infoSpy = jest.spyOn(console, "info");
    handler = new RPCHandler({ ...mods, proxySettings: { ...mods.proxySettings, logTier: "info" } });
    provider = await handler.getFastestRpcProvider();
    const blockNumberResponse = await provider.send("eth_blockNumber", []);
    expect(blockNumberResponse).toBeDefined();
    expect(parseInt(blockNumberResponse)).toBeGreaterThan(0);

    try {
      const response = await provider.send("eth_call", [null, null, null, "latest"]);
      expect(response).toBeDefined();
    } catch (er) {
      expect(er).toBeDefined();
      expect(er).toBeInstanceOf(Error);
    }

    expect(consoleSpy).toBeCalledTimes(0);
    expect(errorSpy).toBeCalledTimes(0);
    expect(debugSpy).toBeCalledTimes(0);
    expect(warnSpy).toBeCalledTimes(0);
    expect(infoSpy).toBeCalledTimes(1);

    const latencies = handler.getLatencies();
    const rpcLatency = latencies["31337__http://127.0.0.1:8545"];
    const INFO_CALL = `› [RPCHandler] ${JSON.stringify({
      latencies: {
        "31337__http://127.0.0.1:8545": rpcLatency,
      },
    })}`;

    const cleanInfoStrings = cleanSpyLogs(infoSpy);
    expect(cleanInfoStrings).toEqual(expect.arrayContaining([cleanLogString(INFO_CALL)]));
  });

  it("should log only 'warn' tiered logs", async () => {
    const errorSpy = jest.spyOn(console, "error");
    const consoleSpy = jest.spyOn(console, "log");
    const debugSpy = jest.spyOn(console, "debug");
    const warnSpy = jest.spyOn(console, "warn");
    handler = new RPCHandler({ ...mods, proxySettings: { ...mods.proxySettings, logTier: "error" } });
    provider = await handler.getFastestRpcProvider();

    try {
      const response = await provider.send("eth_call", [null, null, null, "latest"]);
      expect(response).toBeDefined();
    } catch (er) {
      expect(er).toBeDefined();
      expect(er).toBeInstanceOf(Error);
    }

    expect(errorSpy).toBeCalledTimes(0);
    expect(consoleSpy).toBeCalledTimes(0);
    expect(debugSpy).toBeCalledTimes(0);
    expect(warnSpy).toBeCalledTimes(4);

    const cleanWarnStrings = cleanSpyLogs(warnSpy).flat();
    const filteredStrings = cleanWarnStrings.filter((str) => str.includes(cleanLogString(NULL_ARG_TX_CALL_RETRY)));
    expect(filteredStrings.length).toBeGreaterThanOrEqual(2)
  });

  it("should log only 'fatal' tiered logs", async () => {
    const errorSpy = jest.spyOn(console, "error");
    const consoleSpy = jest.spyOn(console, "log");
    const debugSpy = jest.spyOn(console, "debug");
    const warnSpy = jest.spyOn(console, "warn");

    handler = new RPCHandler({ ...mods, proxySettings: { ...mods.proxySettings, logTier: "fatal" } });
    provider = await handler.getFastestRpcProvider();
    const response = await provider.send("eth_blockNumber", []);
    expect(response).toBeDefined();
    expect(parseInt(response)).toBeGreaterThan(0);

    try {
      const ethCallResponse = await provider.send("eth_call", [null, null, null, "latest"]);
      expect(ethCallResponse).toBeDefined();
    } catch (er) {
      expect(er).toBeDefined();
      expect(er).toBeInstanceOf(Error);
    }

    const cleanLogStrings = cleanSpyLogs(consoleSpy);
    const cleanDebugStrings = cleanSpyLogs(debugSpy);
    const cleanErrorStrings = cleanSpyLogs(errorSpy);

    expect(errorSpy).toBeCalledTimes(4);
    expect(consoleSpy).toBeCalledTimes(0);
    expect(debugSpy).toBeCalledTimes(0);

    expect(cleanLogStrings).toEqual([]);
    expect(cleanDebugStrings).toEqual([]);

    const filteredStrings = cleanErrorStrings.filter((str) => str.includes(cleanLogString(NULL_ARG_TX_CALL)));
    expect(filteredStrings.length).toBeGreaterThanOrEqual(1);
  });

  it("should log all logs when 'verbose'", async () => {
    const logSpy = jest.spyOn(console, "log");
    const errorSpy = jest.spyOn(console, "error");
    const debugSpy = jest.spyOn(console, "debug");
    handler = new RPCHandler({ ...mods, proxySettings: { ...mods.proxySettings, logTier: "verbose" } });
    provider = await handler.getFastestRpcProvider();
    const response = await provider.send("eth_blockNumber", []);
    expect(response).toBeDefined();
    expect(parseInt(response)).toBeGreaterThan(0);

    const cleanLogStrings = cleanSpyLogs(logSpy);
    expect(cleanLogStrings).toEqual(expect.arrayContaining([cleanLogString(INITIALIZED)]));

    const cleanDebugStrings = cleanSpyLogs(debugSpy);
    expect(cleanDebugStrings).toEqual(expect.arrayContaining([cleanLogString(BLOCK_NUMBER_CALL), cleanLogString(BLOCK_NUMBER_CALL)]));

    try {
      const ethCallResponse = await provider.send("eth_call", [null, null, null, "latest"]);
      expect(ethCallResponse).toBeDefined();

      const cleanErrorStrings = cleanSpyLogs(errorSpy);
      expect(cleanErrorStrings).toEqual(expect.arrayContaining([cleanLogString(NULL_ARG_TX_CALL)]));
    } catch (er) {
      expect(er).toBeDefined();
      expect(er).toBeInstanceOf(Error);

      const cleanErrorStrings = cleanSpyLogs(errorSpy);
      const filteredStrings = cleanErrorStrings.filter((str) => str.includes(cleanLogString(NULL_ARG_TX_CALL)));
      expect(filteredStrings.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("should log all logs when 'strictLogs == false' regardless of tier", async () => {
    const logSpy = jest.spyOn(console, "log");
    const errorSpy = jest.spyOn(console, "error");
    const debugSpy = jest.spyOn(console, "debug");
    handler = new RPCHandler({ ...mods, proxySettings: { ...mods.proxySettings, strictLogs: false, logTier: "info" } });
    provider = await handler.getFastestRpcProvider();

    const response = await provider.send("eth_blockNumber", []);
    expect(response).toBeDefined();
    expect(parseInt(response)).toBeGreaterThan(0);

    const cleanLogStrings = cleanSpyLogs(logSpy);
    expect(cleanLogStrings).toEqual(expect.arrayContaining([cleanLogString(INITIALIZED)]));

    const cleanErrorStrings = cleanSpyLogs(errorSpy);
    expect(cleanErrorStrings).toEqual([]);

    const cleanDebugStrings = cleanSpyLogs(debugSpy);
    expect(cleanDebugStrings).toEqual(expect.arrayContaining([cleanLogString(BLOCK_NUMBER_CALL), cleanLogString(BLOCK_NUMBER_CALL)]));
  });

  it("should have multiple logs when retrying failed requests", async () => {
    const logSpy = jest.spyOn(console, "log");
    const errorSpy = jest.spyOn(console, "error");
    const debugSpy = jest.spyOn(console, "debug");
    const warnSpy = jest.spyOn(console, "warn");

    const badRpcs = ["http://127.0.0.1:8546", "http://127.0.0.1:8544", "http://127.0.0.1:8544", "http://127.0.0.1:8544", "http://127.0.0.1:8545"];

    handler = new RPCHandler({
      ...mods,
      networkRpcs: badRpcs,
      proxySettings: { ...mods.proxySettings, logTier: "verbose", strictLogs: false, retryCount: 5, retryDelay: 20 },
    });
    provider = await handler.getFastestRpcProvider();

    try {
      // this call will always fail and bad rpcs are filtered out
      // so it retries 5 times then fails
      const response = await provider.send("eth_call", [null, null, null, "latest"]);
      expect(response).toBeDefined();
      expect(response).toBe("0x" + "00".repeat(32));
    } catch (error) {
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(Error);
    }

    let cleanErrorStrings = cleanSpyLogs(errorSpy);
    const filteredStrings = cleanErrorStrings.filter((str) => str.includes(cleanLogString(NULL_ARG_TX_CALL)));
    expect(filteredStrings.length).toBeGreaterThanOrEqual(2);

    let cleanDebugStrings = cleanSpyLogs(debugSpy);
    expect(cleanDebugStrings).toEqual(
      expect.arrayContaining([
        cleanLogString(DEBUG_CONNECT_TO),
        cleanLogString(DEBUG_RETRY),
        cleanLogString(DEBUG_RETRY_IN_20),
        cleanLogString(`${DEBUG_CALL_NUMBER}1`),
        cleanLogString(`${DEBUG_CALL_NUMBER}2`),
        cleanLogString(`${DEBUG_CALL_NUMBER}3`),
        cleanLogString(`${DEBUG_CALL_NUMBER}4`),
      ])
    );

    debugSpy.mockClear();
    errorSpy.mockClear();

    const res = await provider.send("eth_call", [nonceBitmapData, "latest"]);
    expect(res).toBeDefined();
    expect(res).toBe("0x" + "00".repeat(32));

    const cleanWarnStrings = cleanSpyLogs(warnSpy);
    expect(cleanWarnStrings).toEqual(expect.arrayContaining([cleanLogString(NULL_ARG_TX_CALL_RETRY)]));

    const cleanLogStrings = cleanSpyLogs(logSpy);
    expect(cleanLogStrings).toEqual(expect.arrayContaining([cleanLogString(INITIALIZED)]));

    cleanDebugStrings = cleanSpyLogs(debugSpy);
    expect(cleanDebugStrings).toEqual(expect.arrayContaining([cleanLogString(NONCE_BITMAP_ETH_CALL), cleanLogString(NONCE_BITMAP_ETH_CALL)]));

    cleanErrorStrings = cleanSpyLogs(errorSpy);
    expect(cleanErrorStrings).toEqual([]);
  });
});

function cleanSpyLogs(
  spy: jest.SpiedFunction<{
    (...data: any[]): void;
    (message?: any, ...optionalParams: any[]): void;
  }>
) {
  const strs = spy.mock.calls.map((call) => call.map((str) => str.toString()).join(" "));
  return strs.flat().map((str) => cleanLogString(str));
}

function cleanLogString(logString: string) {
  return logString.replace(ansiEscapeCodes, "").replace(/\n/g, "").replace(/\r/g, "").replace(/\t/g, "");
}
