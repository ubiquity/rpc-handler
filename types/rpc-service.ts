import { NetworkId, ValidBlockData } from "./handler";
import axios, { AxiosError } from "axios";
import { RPCHandler } from "./rpc-handler";

// this is similar to `ValidBlockData`, I didn't want to change it incase it's in other projects
type JsonRpcResponse = { jsonrpc: string; id: number; result: string | { number: string; timestamp: string; hash: string } };
export type PromiseResult<T extends JsonRpcResponse = JsonRpcResponse> = {
  success: boolean;
  rpcUrl: string;
  duration: number;
  rpcMethod: string;
  error?: string;
  data?: T;
};

const getBlockNumberPayload = {
  jsonrpc: "2.0",
  method: "eth_getBlockByNumber",
  params: ["latest", false],
  id: 1,
};

const storageReadPayload = {
  jsonrpc: "2.0",
  method: "eth_getCode",
  params: ["0x000000000022D473030F116dDEE9F6B43aC78BA3", "latest"],
  id: 1,
};

function formatHexToDecimal(hex: string): string {
  return parseInt(hex, 16).toString(10);
}

export type RequestPayload = { headers: object; method: string; params: unknown[]; jsonrpc: string; id: number };

export class RPCService {
  constructor(private readonly _rpcHandler: RPCHandler) {}

  async makeRpcRequest(payload: RequestPayload, raceData: { rpcUrl: string; rpcTimeout: number }): Promise<PromiseResult> {
    const instance = axios.create({
      timeout: raceData.rpcTimeout,
      headers: payload.headers,
    });
    Reflect.deleteProperty(payload, "headers");
    const rpcUrl = raceData.rpcUrl;
    const payloadString = JSON.stringify(payload);
    const startTime = performance.now();
    try {
      const res = await instance.post(raceData.rpcUrl, payloadString);
      return {
        rpcUrl,
        duration: performance.now() - startTime,
        success: "result" in (res?.data ?? {}) ? true : false,
        data: res?.data || null,
        rpcMethod: payload.method,
      };
    } catch (err) {
      if (err instanceof AxiosError) {
        const isTimeout = err.code === "ECONNABORTED";
        return {
          rpcUrl,
          success: false,
          duration: isTimeout ? performance.now() - startTime : 0,
          error: isTimeout ? "timeout" : err.message,
          rpcMethod: payload.method,
        };
      }
      return {
        rpcUrl,
        success: false,
        duration: 0,
        error: String(err),
        rpcMethod: payload.method,
      };
    }
  }

  async testRpcPerformance({
    networkId,
    latencies,
    runtimeRpcs,
    rpcTimeout,
  }: {
    networkId: NetworkId;
    latencies: Record<string, number>;
    runtimeRpcs: string[];
    rpcTimeout: number;
  }): Promise<{ latencies: Record<string, number>; runtimeRpcs: string[] }> {
    const rpcPromises: Record<string, Promise<PromiseResult>[]> = {};
    this.createBlockReqAndByteCodeRacePromises(runtimeRpcs, rpcPromises, rpcTimeout);
    const rpcResults = await Promise.allSettled(Object.values(rpcPromises).flat());

    /**
     * We need to detect providers which are out of sync. This is done
     * by comparing all blocknumber results. If the blocknumber is the same
     * for all providers, we can assume that they are in sync.
     *
     * So, detect across all providers which blocknumber was returned most,
     * we assume this is the correct blocknumber.
     */

    const blockNumberCounts: Record<string, number> = {};
    const blockNumberResults: Record<string, string> = {};

    if (!rpcResults.length) {
      this._rpcHandler.log("error", "[RPCService] No RPC results found", { rpcResults });
      return { latencies, runtimeRpcs };
    }

    rpcResults.forEach((result) => this._processRpcResult({ result, networkId, latencies, runtimeRpcs, blockNumberCounts, blockNumberResults }));
    const bncKeys = Object.keys(blockNumberCounts);
    if (!bncKeys.length) {
      this._rpcHandler.log("error", "[RPCService] No blocknumber counts found", { blockNumberCounts });
      return { latencies, runtimeRpcs };
    }

    const mostCommonBlockNumber = bncKeys.reduce((a, b) => (blockNumberCounts[a] > blockNumberCounts[b] ? a : b));
    runtimeRpcs = Object.keys(blockNumberResults).filter((rpcUrl) => {
      if (blockNumberResults[rpcUrl] !== mostCommonBlockNumber) {
        this._rpcHandler.log(
          "info",
          `[RPCService] Detected out of sync provider: ${rpcUrl} with blocknumber: ${formatHexToDecimal(blockNumberResults[rpcUrl])} vs ${formatHexToDecimal(mostCommonBlockNumber)}`,
          {
            rpcUrl,
            blockNumber: blockNumberResults[rpcUrl],
            mostCommonBlockNumber,
          }
        );
        return false;
      }
      return true;
    });

    this._rpcHandler.log(
      "ok",
      `[RPCService] Detected most common blocknumber: ${formatHexToDecimal(mostCommonBlockNumber)} with ${runtimeRpcs.length} providers in sync`
    );

    return { latencies, runtimeRpcs };
  }

  _processRpcResult({
    result,
    networkId,
    latencies,
    runtimeRpcs,
    blockNumberCounts,
    blockNumberResults,
  }: {
    result: PromiseSettledResult<PromiseResult>;
    networkId: NetworkId;
    latencies: Record<string, number>;
    runtimeRpcs: string[];
    blockNumberCounts: Record<string, number>;
    blockNumberResults: Record<string, string>;
  }) {
    if (result.status === "fulfilled" && result.value.success) {
      if (result.value.rpcMethod === "eth_getBlockByNumber") {
        this.processBlockReqResult({ result, blockNumberCounts, blockNumberResults });
      } else if (result.value.rpcMethod === "eth_getCode" && !this.isBytecodeValid({ result })) {
        return;
      }
      latencies[`${networkId}__${result.value.rpcUrl}`] = result.value.duration;
    } else if (result.status === "fulfilled") {
      const fulfilledResult = result.value;
      const index = runtimeRpcs.indexOf(fulfilledResult.rpcUrl);
      if (index > -1) {
        runtimeRpcs.splice(index, 1);
      }
    }
  }

  isBytecodeValid({ result }: { result: PromiseFulfilledResult<PromiseResult> }) {
    const { rpcUrl, data } = result.value;
    let bytecode: string | null = null;

    if (typeof data === "string") {
      bytecode = data;
    } else if (typeof data === "object" && data && "result" in data) {
      bytecode = String(data.result);
    }

    if (!bytecode) {
      this._rpcHandler.log("error", `[RPCService] Could not find Permit2 bytecode.`, { rpcUrl, data });
      return false;
    }

    const expected = "0x604060808152600";

    const subbed = bytecode.substring(0, expected.length);
    if (subbed !== expected) {
      this._rpcHandler.log("error", `[RPCService] Permit2 bytecode mismatch.`, { rpcUrl, data });
      return false;
    }

    return true;
  }

  processBlockReqResult({
    result,
    blockNumberCounts,
    blockNumberResults,
  }: {
    result: PromiseFulfilledResult<PromiseResult>;
    blockNumberCounts: Record<string, number>;
    blockNumberResults: Record<string, string>;
  }) {
    const { rpcUrl, data } = result.value;
    const blockData = data as ValidBlockData;
    if (this._verifyBlock(blockData)) {
      const blockNumber = blockData.result.number;
      blockNumberResults[rpcUrl] = blockNumber;
      blockNumberCounts[blockNumber] = blockNumberCounts[blockNumber] ? blockNumberCounts[blockNumber] + 1 : 1;
    } else {
      this._rpcHandler.log("error", `[RPCService] Invalid block data from ${rpcUrl}`, { rpcUrl, data });
    }
  }

  private _verifyBlock(data: ValidBlockData): boolean {
    try {
      const { jsonrpc, id, result } = data;
      const { number, timestamp, hash } = result;
      return (
        jsonrpc === "2.0" && id === 1 && parseInt(number, 16) > 0 && parseInt(timestamp, 16) > 0 && hash.match(/[0-9|a-f|A-F|x]/gm)?.join("").length === 66
      );
    } catch (error) {
      return false;
    }
  }

  createBlockReqAndByteCodeRacePromises(runtimeRpcs: string[], rpcPromises: Record<string, Promise<PromiseResult>[]>, rpcTimeout: number) {
    runtimeRpcs.forEach((rpcUrl) => {
      rpcPromises[rpcUrl] = [
        this.makeRpcRequest(
          {
            headers: { "Content-Type": "application/json" },
            ...getBlockNumberPayload,
          },
          {
            rpcTimeout: rpcTimeout,
            rpcUrl,
          }
        ).catch((err) => {
          return {
            rpcUrl,
            success: false,
            duration: 0,
            error: String(err),
            rpcMethod: "eth_getBlockByNumber",
          };
        }),
        this.makeRpcRequest(
          {
            headers: { "Content-Type": "application/json" },
            ...storageReadPayload,
          },
          {
            rpcTimeout: rpcTimeout,
            rpcUrl,
          }
        ).catch((err) => {
          return {
            rpcUrl,
            success: false,
            duration: 0,
            error: String(err),
            rpcMethod: "eth_getCode",
          };
        }),
      ];
    });
  }
}
