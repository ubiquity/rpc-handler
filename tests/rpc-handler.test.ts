import { RPCHandler } from "../src/rpc-handler";
import { JsonRpcProvider } from "@ethersproject/providers";
import { testConfig } from "./constants/test-constants";

jest.mock("@ethersproject/providers", () => ({
  JsonRpcProvider: jest.fn(),
}));

jest.mock("../src/services/storage-service", () => ({
  StorageService: {
    getLatencies: jest.fn(),
    setLatencies: jest.fn(),
    getRefreshLatencies: jest.fn(),
    setRefreshLatencies: jest.fn(),
  },
}));

jest.mock("../src/services/rpc-service", () => ({
  RPCService: {
    testRpcPerformance: jest.fn(),
    findFastestRpc: jest.fn(),
  },
}));

jest.mock("axios", () => ({
  post: jest.fn(),
}));

describe("RPCHandler", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.mock("../src/rpc-handler", () => ({
      RPCHandler: {
        _latencies: {
          rpcUrl1_1: 100,
          rpcUrl2_1: 200,
          rpcUrl4_1: 68,
          rpcUrl5_1: 57,
          rpcUrl3_1: 150,
        },
      },
    }));
  });
  it("should instantiate RPCHandler with the provided networkId and cacheRefreshCycles", () => {
    const networkId = 1;

    const rpcHandler = new RPCHandler(networkId, testConfig);

    expect(rpcHandler).toBeInstanceOf(RPCHandler);
    expect(rpcHandler.getProvider()).toBeInstanceOf(JsonRpcProvider);
  });

  it("should throw an error when failing to get a JsonRpcProvider", async () => {
    const networkId = 1;

    const rpcHandler = new RPCHandler(networkId, testConfig);

    await expect(rpcHandler.testRpcPerformance(9999)).rejects.toThrow();
  });
});

describe("Node env detection", () => {
  it("should detect a node environment", () => {
    const rpcHandler = RPCHandler.getInstance(1, testConfig);
    // @ts-expect-error _env is private
    expect(rpcHandler._env).toBe("node");
  });
});
