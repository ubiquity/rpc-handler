import { RPCService } from "../src/services/RPCService";
import { StorageService } from "../src/services/StorageService";
import axios from "axios";

jest.mock("axios", () => ({
  post: jest.fn(),
}));

jest.mock("../src/services/StorageService", () => ({
  StorageService: {
    setLatencies: jest.fn(),
  },
}));

beforeEach(() => {
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

describe("RPCService", () => {
  it("should test RPC performance with empty runtimeRpcs array", async () => {
    const runtimeRpcs = [];
    const latencies = {};
    const rpcHeader = {};
    const rpcBody = "rpcBody";
    const env = "browser";

    const result = await RPCService.testRpcPerformance(1, latencies, runtimeRpcs, rpcHeader, rpcBody, env);

    expect(result).toEqual({ latencies: {}, runtimeRpcs: [] });
  });

  it("should successfully find fastest RPC with valid input", () => {
    const latencies: Record<string, number> = {
      rpcUrl1_1: 100,
      rpcUrl2_1: 200,
      rpcUrl4_1: 68,
      rpcUrl5_1: 57,
      rpcUrl3_1: 150,
    };

    const networkId = 1;

    const result = RPCService.findFastestRpc(latencies, networkId);

    expect(result).toBe("rpcUrl5");

    jest.restoreAllMocks();
  });

  it("should successfully race promises until success with valid input", async () => {
    const runtimeRpcs = ["rpcUrl1", "rpcUrl2", "rpcUrl3"];
    const latencies = {
      rpcUrl1: 100,
      rpcUrl2: 200,
      rpcUrl3: 150,
    };

    jest.spyOn(axios, "post").mockRejectedValueOnce(new Error("Error 1")).mockRejectedValueOnce(new Error("Error 2")).mockResolvedValueOnce();

    jest.spyOn(performance, "now").mockReturnValueOnce(100);

    const result = await RPCService._raceUntilSuccess(
      runtimeRpcs.map(() => Promise.resolve()),
      runtimeRpcs,
      latencies
    );

    expect(result).toEqual({
      latencies,
      runtimeRpcs,
    });

    jest.restoreAllMocks();
  });

  it("should throw an error and remove the corresponding rpcUrl from runtimeRpcs and latencies when the rpcUrl is invalid", async () => {
    const networkId = 1;
    const runtimeRpcs = ["invalidRpcUrl"];
    const latencies = {};
    const rpcHeader = {};
    const rpcBody = "rpcBody";
    const env = "browser";

    jest.spyOn(axios, "post").mockRejectedValueOnce(new Error("Invalid rpcUrl"));

    const setLatenciesMock = jest.spyOn(StorageService, "setLatencies");

    const result = await RPCService.testRpcPerformance(networkId, latencies, runtimeRpcs, rpcHeader, rpcBody, env);

    expect(result).toEqual({ latencies: {}, runtimeRpcs: [] });

    expect(setLatenciesMock).toHaveBeenCalledWith(env, {});

    jest.restoreAllMocks();
  });
});
