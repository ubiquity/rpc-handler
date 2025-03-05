import { ValidBlockData } from "./handler";
import axios, { AxiosError } from "axios";
import { RPCHandler } from "./rpc-handler";

// this is similar to `ValidBlockData`, I didn't want to change it incase it's in other projects
export type JsonRpcResponseData = {
  jsonrpc: string;
  id: number;
  result: string | { number: string; timestamp: string; hash?: string; transactionHash?: string };
};
export type RequestPayload = { headers: object; method: string; params: unknown[]; jsonrpc: string; id: number };
export type RpcPromiseResult<T extends JsonRpcResponseData = JsonRpcResponseData> = {
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

export class RPCService {
  private _blockNumberCounts: Record<string, number> = {};
  private _blockNumberResults: Record<string, string> = {};

  constructor(private readonly _rpcHandler: RPCHandler) {}

  public async testRpcPerformance() {
    const runtimeRpcs = this._rpcHandler.getRuntimeRpcs();
    const rpcPromises = this.createBlockRequestAndByteCodeRacePromises(runtimeRpcs);
    const rpcResults = await Promise.allSettled(Object.values(rpcPromises).flat());

    /**
     * We need to detect providers which are out of sync. This is done
     * by comparing all blocknumber results. If the blocknumber is the same
     * for all providers, we can assume that they are in sync.
     *
     * So, detect across all providers which blocknumber was returned most,
     * we assume this is the correct blocknumber.
     */

    if (!rpcResults.length) {
      this._rpcHandler.log("error", "[RPCService] No RPC results found", { rpcResults });
      return;
    }

    rpcResults.forEach((result) => this._processRpcResult(result));
    const bncKeys = Object.keys(this._blockNumberCounts);
    if (!bncKeys.length) {
      this._rpcHandler.log("error", "[RPCService] No block number counts found", { blockNumberCounts: this._blockNumberCounts });
      return;
    }

    const mostCommonBlockNumber = bncKeys.reduce((a, b) => (this._blockNumberCounts[a] > this._blockNumberCounts[b] ? a : b));

    Object.keys(this._blockNumberResults).forEach((rpcUrl) => {
      if (this._blockNumberResults[rpcUrl] !== mostCommonBlockNumber) {
        this._rpcHandler.updateRuntimeRpc(rpcUrl, "remove");
        this._rpcHandler.log(
          "info",
          `[RPCService] Detected out of sync provider: ${rpcUrl} with block number: ${formatHexToDecimal(this._blockNumberResults[rpcUrl])} vs ${formatHexToDecimal(mostCommonBlockNumber)}`,
          {
            rpcUrl,
            blockNumber: this._blockNumberResults[rpcUrl],
            mostCommonBlockNumber,
          }
        );
      }
    });

    this._rpcHandler.log(
      "ok",
      `[RPCService] Detected most common blocknumber: ${formatHexToDecimal(mostCommonBlockNumber)} with ${runtimeRpcs.length} providers in sync`
    );
  }

  private _processRpcResult(result: PromiseSettledResult<RpcPromiseResult>) {
    if (result.status === "fulfilled" && result.value.success) {
      this._processSuccessResponse(result);
      this._rpcHandler.updateRpcProviderLatency(result.value.rpcUrl, result.value.duration);
    } else if (result.status === "fulfilled") {
      this._rpcHandler.updateRuntimeRpc(result.value.rpcUrl, "remove");
    }
  }

  private _processSuccessResponse(result: PromiseFulfilledResult<RpcPromiseResult<JsonRpcResponseData>>) {
    const { rpcMethod } = result.value;
    if (rpcMethod === "eth_getBlockByNumber") {
      this._processBlockRequestResult(result);
    } else {
      this._isBytecodeValid(result);
    }
  }

  private _isBytecodeValid(result: PromiseFulfilledResult<RpcPromiseResult>) {
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

  private _processBlockRequestResult(result: PromiseFulfilledResult<RpcPromiseResult>) {
    const { rpcUrl, data } = result.value;
    const blockData = data as ValidBlockData;
    if (this._verifyBlock(blockData)) {
      const blockNumber = blockData.result.number;
      this._blockNumberResults[rpcUrl] = blockNumber;
      this._blockNumberCounts[blockNumber] = this._blockNumberCounts[blockNumber] ? this._blockNumberCounts[blockNumber] + 1 : 1;
    } else {
      this._rpcHandler.log("error", `[RPCService] Invalid block data from ${rpcUrl}`, { rpcUrl, data });
    }
  }

  private _verifyBlock(data: ValidBlockData): boolean {
    try {
      const { jsonrpc, id, result } = data;
      const { number, timestamp, hash } = result;
      const isValidBlockNumber = jsonrpc === "2.0" && id === 1 && parseInt(number, 16) > 0 && parseInt(timestamp, 16) > 0;
      return isValidBlockNumber && hash.match(/[0-9|a-f|A-F|x]/gm)?.join("").length === 66;
    } catch (error) {
      return false;
    }
  }

  async makeRpcRequest(payload: RequestPayload, rpcUrl: string): Promise<RpcPromiseResult> {
    const instance = axios.create({
      timeout: this._rpcHandler.getRpcTimeout(),
      headers: payload.headers,
    });
    Reflect.deleteProperty(payload, "headers");
    const payloadString = JSON.stringify(payload);
    const startTime = performance.now();
    try {
      const res = await instance.post(rpcUrl, payloadString);
      return {
        rpcUrl,
        duration: performance.now() - startTime,
        success: !!("result" in (res?.data ?? {})),
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

  createBlockRequestAndByteCodeRacePromises(runtimeRpcs: string[]): Record<string, Promise<RpcPromiseResult>[]> {
    const rpcPromises: Record<string, Promise<RpcPromiseResult>[]> = {};
    runtimeRpcs.forEach((rpcUrl) => {
      rpcPromises[rpcUrl] = [
        this.makeRpcRequest(
          {
            headers: { "Content-Type": "application/json" },
            ...getBlockNumberPayload,
          },
          rpcUrl
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
          rpcUrl
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

    return rpcPromises;
  }
}
