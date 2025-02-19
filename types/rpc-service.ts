import { JsonRpcProvider } from "@ethersproject/providers";
import { NetworkId, ValidBlockData } from "./handler";
import axios, { AxiosError } from "axios";
type PromiseResult = { success: boolean; rpcUrl: string; duration: number; isBlockReq: boolean, error?: string, data?: unknown };

const getBlockNumberPayload = JSON.stringify({
  jsonrpc: "2.0",
  method: "eth_getBlockByNumber",
  params: ["latest", false],
  id: 1,
});

const nonceBitmapPayload = JSON.stringify({
  jsonrpc: "2.0",
  method: "eth_call",
  params: [
    {
      to: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
      data: "0x4fe02b44000000000000000000000000d9530f3fbbea11bed01dc09e79318f2f20223716001fd097bcb5a1759ce02c0a671386a0bbbfa8216559e5855698a9d4de4cddea",
    },
    "latest",
  ],
  id: 1,
})


export class RPCService {
  static async makeRpcRequest(rpcUrl: string, rpcTimeout: number, rpcHeader: object, isBlockReq = true): Promise<PromiseResult> {
    const instance = axios.create({
      timeout: rpcTimeout,
      headers: rpcHeader,
    });
    const startTime = performance.now();
    try {
      const res = await instance.post(rpcUrl, isBlockReq ? getBlockNumberPayload : nonceBitmapPayload);
      return {
        rpcUrl,
        duration: performance.now() - startTime,
        success: true,
        data: res.data,
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
    rpcTimeout: number
  ): Promise<{ latencies: Record<string, number>; runtimeRpcs: string[] }> {
    async function requestEndpoint(rpcUrl: string, isBlockReq = true): Promise<PromiseResult> {
      try {
        return await RPCService.makeRpcRequest(rpcUrl, rpcTimeout, rpcHeader, isBlockReq);
      } catch (err) {
        console.error(`Failed to reach endpoint. ${err}`);
        throw new Error(rpcUrl);
      }
    }

    const rpcPromises: Record<string, Promise<PromiseResult>> = {};
    runtimeRpcs.forEach((rpcUrl) => {
      rpcPromises[rpcUrl] = requestEndpoint(rpcUrl);
    });

    const rpcResults = await Promise.allSettled(Object.values(rpcPromises));

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

    rpcResults.forEach((result) => {
      if (result.status === "fulfilled" && result.value.success) {
        if (result.value.isBlockReq) {
          const { rpcUrl, data } = result.value;
          const blockData = data as ValidBlockData;
          if (RPCService._verifyBlock(blockData)) {
            const blockNumber = blockData.result.number;
            blockNumberResults[rpcUrl] = blockNumber;
            blockNumberCounts[blockNumber] = blockNumberCounts[blockNumber] ? blockNumberCounts[blockNumber] + 1 : 1;
          }
        } else {
          const { rpcUrl, data } = result.value;
          const nonceBitmap = data as string;
          if (nonceBitmap === "0x" + "00".repeat(32)) {
            blockNumberResults[rpcUrl] = nonceBitmap;
            blockNumberCounts[nonceBitmap] = blockNumberCounts[nonceBitmap] ? blockNumberCounts[nonceBitmap] + 1 : 1;
          }
        }
        latencies[`${networkId}__${result.value.rpcUrl}`] = result.value.duration
      } else if (result.status === "fulfilled") {
        const fulfilledResult = result.value;
        const index = runtimeRpcs.indexOf(fulfilledResult.rpcUrl);
        if (index > -1) {
          runtimeRpcs.splice(index, 1);
        }
      }
    });

    const mostCommonBlockNumber = Object.keys(blockNumberCounts).reduce((a, b) => (blockNumberCounts[a] > blockNumberCounts[b] ? a : b));
    runtimeRpcs = Object.keys(blockNumberResults).filter((rpcUrl) => blockNumberResults[rpcUrl] === mostCommonBlockNumber);

    return { latencies, runtimeRpcs };
  }

  static async findFastestRpc(latencies: Record<string, number>, networkId: NetworkId): Promise<string | null> {
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
      console.error("[RPCService] Failed to find fastest RPC", error);
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
