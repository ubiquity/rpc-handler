import { RPCHandler } from "../src/rpc-handler";
import { JsonRpcProvider } from "@ethersproject/providers";

jest.mock("@ethersproject/providers", () => ({
  JsonRpcProvider: jest.fn(),
}));

jest.mock("../src/services/StorageService", () => ({
  StorageService: {
    getLatencies: jest.fn(),
    setLatencies: jest.fn(),
    getRefreshLatencies: jest.fn(),
    setRefreshLatencies: jest.fn(),
  },
}));

jest.mock("../src/services/RPCService", () => ({
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
    const cacheRefreshCycles = 5;

    const rpcHandler = new RPCHandler(networkId, cacheRefreshCycles);

    expect(rpcHandler).toBeInstanceOf(RPCHandler);
    expect(rpcHandler.getProvider()).toBeInstanceOf(JsonRpcProvider);
  });

  it("should throw an error when failing to get a JsonRpcProvider", async () => {
    const networkId = 1;
    const cacheRefreshCycles = 5;

    const rpcHandler = new RPCHandler(networkId, cacheRefreshCycles);

    await expect(rpcHandler.testRpcPerformance(9999)).rejects.toThrow();
  });
});

describe("Node env detection", () => {
  it("should detect a node environment", () => {
    const rpcHandler = RPCHandler.getInstance(1);
    expect(rpcHandler._env).toBe("node");
  });
});
