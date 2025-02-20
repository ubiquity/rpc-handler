import { NetworkId, ValidBlockData } from "./handler";
import axios, { AxiosError } from "axios";
import { RPCHandler } from "./rpc-handler";
type PromiseResult = { success: boolean; rpcUrl: string; duration: number; isBlockReq: boolean; error?: string; data?: unknown };

const getBlockNumberPayload = JSON.stringify({
  jsonrpc: "2.0",
  method: "eth_getBlockByNumber",
  params: ["latest", false],
  id: 1,
});

const storageReadPayload = JSON.stringify({
  jsonrpc: "2.0",
  method: "eth_getCode",
  params: ["0x000000000022D473030F116dDEE9F6B43aC78BA3", "latest"],
  id: 1,
});

function formatHexToDecimal(hex: string): string {
  return parseInt(hex, 16).toString(10);
}

export class RPCService {
  static async makeRpcRequest(rpcUrl: string, rpcTimeout: number, rpcHeader: object, isBlockReq = true): Promise<PromiseResult> {
    const instance = axios.create({
      timeout: rpcTimeout,
      headers: rpcHeader,
    });
    const startTime = performance.now();
    try {
      const res = await instance.post(rpcUrl, isBlockReq ? getBlockNumberPayload : storageReadPayload);
      return {
        rpcUrl,
        duration: performance.now() - startTime,
        success: true,
        data: res?.data || null,
        isBlockReq,
      };
    } catch (err) {
      if (err instanceof AxiosError) {
        const isTimeout = err.code === "ECONNABORTED";
        return {
          rpcUrl,
          success: false,
          duration: isTimeout ? performance.now() - startTime : 0,
          error: isTimeout ? "timeout" : err.message,
          isBlockReq,
        };
      }
      return {
        rpcUrl,
        success: false,
        duration: 0,
        error: `${err}`,
        isBlockReq,
      };
    }
  }

  static async testRpcPerformance(
    networkId: NetworkId,
    latencies: Record<string, number>,
    runtimeRpcs: string[],
    rpcHeader: object,
    rpcTimeout: number,
    rpcHandler: RPCHandler
  ): Promise<{ latencies: Record<string, number>; runtimeRpcs: string[] }> {
    async function requestEndpoint(rpcUrl: string, isBlockReq = true): Promise<PromiseResult> {
      try {
        return await RPCService.makeRpcRequest(rpcUrl, rpcTimeout, rpcHeader, isBlockReq);
      } catch (err) {
        rpcHandler.log("error", "[RPCService] Failed to make RPC request", { rpcUrl, err: String(err) });
        throw new Error(rpcUrl);
      }
    }

    const rpcPromises: Record<string, Promise<PromiseResult>[]> = {};
    runtimeRpcs.forEach((rpcUrl) => {
      rpcPromises[rpcUrl] = [requestEndpoint(rpcUrl, true), requestEndpoint(rpcUrl, false)];
    });

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

    rpcResults.forEach((result) => this._processRpcResult({ result, networkId, latencies, runtimeRpcs, blockNumberCounts, blockNumberResults, rpcHandler }));

    const mostCommonBlockNumber = Object.keys(blockNumberCounts).reduce((a, b) => (blockNumberCounts[a] > blockNumberCounts[b] ? a : b));
    runtimeRpcs = Object.keys(blockNumberResults).filter((rpcUrl) => {
      if (blockNumberResults[rpcUrl] !== mostCommonBlockNumber) {
        rpcHandler.log(
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

    rpcHandler.log(
      "ok",
      `[RPCService] Detected most common blocknumber: ${formatHexToDecimal(mostCommonBlockNumber)} with ${runtimeRpcs.length} providers in sync`
    );

    return { latencies, runtimeRpcs };
  }

  static _processRpcResult({
    result,
    networkId,
    latencies,
    runtimeRpcs,
    blockNumberCounts,
    blockNumberResults,
    rpcHandler,
  }: {
    result: PromiseSettledResult<PromiseResult>;
    networkId: NetworkId;
    latencies: Record<string, number>;
    runtimeRpcs: string[];
    blockNumberCounts: Record<string, number>;
    blockNumberResults: Record<string, string>;
    rpcHandler: RPCHandler;
  }) {
    if (result.status === "fulfilled" && result.value.success) {
      if (result.value.isBlockReq) {
        this.processBlockReqResult({ result, blockNumberCounts, blockNumberResults, rpcHandler });
      } else if (!this.processBytecodeResponse({ result, rpcHandler })) {
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

  static processBytecodeResponse({ result, rpcHandler }: { result: PromiseFulfilledResult<PromiseResult>; rpcHandler: RPCHandler }) {
    const { rpcUrl, data } = result.value;
    let bytecode: string | null = null;

    if (typeof data === "string") {
      bytecode = data;
    } else if (typeof data === "object" && data && "result" in data) {
      bytecode = String(data.result);
    }

    if (!bytecode) {
      rpcHandler.log("error", `[RPCService] Could not find Permit2 bytecode.`, { rpcUrl, data });
      return false;
    }

    const expected = "0x604060808152600";

    try {
      const subbed = bytecode.substring(0, expected.length);
      if (subbed !== expected) {
        rpcHandler.log("error", `[RPCService] Permit2 bytecode mismatch.`, { rpcUrl, data });
        return false;
      }
    } catch (error) {
      rpcHandler.log("error", `[RPCService] Failed to process bytecode.`, { rpcUrl, data });
      return false;
    }

    return true;
  }

  static processBlockReqResult({
    result,
    blockNumberCounts,
    blockNumberResults,
    rpcHandler,
  }: {
    result: PromiseFulfilledResult<PromiseResult>;
    blockNumberCounts: Record<string, number>;
    blockNumberResults: Record<string, string>;
    rpcHandler: RPCHandler;
  }) {
    const { rpcUrl, data } = result.value;
    const blockData = data as ValidBlockData;
    if (RPCService._verifyBlock(blockData)) {
      const blockNumber = blockData.result.number;
      blockNumberResults[rpcUrl] = blockNumber;
      blockNumberCounts[blockNumber] = blockNumberCounts[blockNumber] ? blockNumberCounts[blockNumber] + 1 : 1;
    } else {
      rpcHandler.log("error", `[RPCService] Invalid block data from ${rpcUrl}`, { rpcUrl, data });
    }
  }

  static async findFastestRpc(latencies: Record<string, number>, networkId: NetworkId, rpcHandler: RPCHandler): Promise<string | null> {
    try {
      const validLatencies: Record<string, number> = Object.entries(latencies)
        .filter(([key]) => key.startsWith(`${networkId}__`))
        .reduce(
          (acc, [key, value]) => {
            acc[key] = value;
            return acc;
          },
          {} as Record<string, number>
        );

      return Object.keys(validLatencies)
        .reduce((a, b) => (validLatencies[a] < validLatencies[b] ? a : b))
        .split("__")[1];
    } catch (error) {
      rpcHandler.log("error", "[RPCService] Failed to find fastest RPC", { er: String(error) });
      return null;
    }
  }

  static _verifyBlock(data: ValidBlockData): boolean {
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
}
