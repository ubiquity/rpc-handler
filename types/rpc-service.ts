import { NetworkId, ValidBlockData } from "./handler";
import axios from "axios";
type PromiseResult = { success: boolean; rpcUrl: string; duration: number };

export class RPCService {
  static async testRpcPerformance(
    networkId: NetworkId,
    latencies: Record<string, number>,
    runtimeRpcs: string[],
    rpcHeader: object,
    rpcBody: string,
    rpcTimeout: number
  ): Promise<{ latencies: Record<string, number>; runtimeRpcs: string[] }> {
    const instance = axios.create({
      timeout: rpcTimeout,
      headers: rpcHeader,
    });

    const timeoutPromise = new Promise((resolve) => {
      const timeoutId = setTimeout(() => resolve({ success: false, duration: 0 }), rpcTimeout);
      timeoutId.unref();
    });

    const successfulPromises = runtimeRpcs.map<Promise<PromiseResult>>(
      (rpcUrl) =>
        new Promise<PromiseResult>((resolve) => {
          const startTime = performance.now();
          Promise.race([instance.post(rpcUrl, rpcBody), timeoutPromise])
            .then(() => {
              resolve({
                rpcUrl,
                duration: performance.now() - startTime,
                success: true,
              });
            })
            .catch(() => {
              resolve({ rpcUrl, success: false, duration: 0 });
            });
        })
    );

    const fastest = await Promise.race(successfulPromises);

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
    if (Object.keys(latencies).length === 0) {
      throw new Error("[RPCService] No latencies found");
    }
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
