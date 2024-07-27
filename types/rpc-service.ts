import { NetworkId, ValidBlockData } from "./handler";
import axios, { AxiosError } from "axios";
type PromiseResult = { success: boolean; rpcUrl: string; duration: number; error?: string };

const rpcBody = JSON.stringify({
  jsonrpc: "2.0",
  method: "eth_getBlockByNumber",
  params: ["latest", false],
  id: 1,
});

async function makeRpcRequest(rpcUrl: string, rpcTimeout: number, rpcHeader: object): Promise<PromiseResult> {
  const abortController = new AbortController();
  const instance = axios.create({
    timeout: rpcTimeout,
    headers: rpcHeader,
    signal: abortController.signal,
  });
  const startTime = performance.now();
  try {
    await instance.post(rpcUrl, rpcBody);
    return {
      rpcUrl,
      duration: performance.now() - startTime,
      success: true,
    };
  } catch (err) {
    if (err instanceof AxiosError) {
      const isTimeout = err.code === "ECONNABORTED";
      return {
        rpcUrl,
        success: false,
        duration: isTimeout ? performance.now() - startTime : 0,
        error: isTimeout ? "timeout" : err.message,
      };
    }
    return {
      rpcUrl,
      success: false,
      duration: 0,
      error: `${err}`,
    };
  } finally {
    // console.log("6.makeRpcRequest");
    // abortController.abort();
  }
}

export class RPCService {
  static async testRpcPerformance(
    networkId: NetworkId,
    latencies: Record<string, number>,
    runtimeRpcs: string[],
    rpcHeader: object,
    rpcTimeout: number
  ): Promise<{ latencies: Record<string, number>; runtimeRpcs: string[] }> {
    const successfulPromises = runtimeRpcs.map((rpcUrl) => makeRpcRequest(rpcUrl, rpcTimeout, rpcHeader));

    async function getFirstSuccessfulRequest(requests: Promise<PromiseResult>[]) {
      if (requests.length === 0) {
        throw new Error("All requests failed");
      }

      try {
        return await Promise.race(requests);
      } catch {
        return getFirstSuccessfulRequest(requests.slice(1));
      }
    }
    // const fastest = await Promise.race(successfulPromises);
    const fastest = await getFirstSuccessfulRequest(successfulPromises);

    if (fastest.success) {
      latencies[`${networkId}__${fastest.rpcUrl}`] = fastest.duration;
    }

    const allResults = await Promise.allSettled(successfulPromises);

    allResults.forEach((result) => {
      if (result.status === "fulfilled" && result.value.success) {
        latencies[`${networkId}__${result.value.rpcUrl}`] = result.value.duration;
      } else if (result.status === "fulfilled") {
        const fulfilledResult = result.value;
        const index = runtimeRpcs.indexOf(fulfilledResult.rpcUrl);
        if (index > -1) {
          runtimeRpcs.splice(index, 1);
        }
      }
    });

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
