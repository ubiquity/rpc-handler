import { ValidBlockData } from "./handler";
type PromiseResult = { success: boolean; rpcUrl: string; duration: number };

export class RPCService {
  static async testRpcPerformance(
    networkId: number,
    latencies: Record<string, number>,
    runtimeRpcs: string[],
    rpcHeader: object,
    rpcBody: string,
    rpcTimeout: number
  ): Promise<{ latencies: Record<string, number>; runtimeRpcs: string[] }> {
    const successfulPromises = runtimeRpcs.map<Promise<PromiseResult>>(
      (rpcUrl) =>
        new Promise<PromiseResult>((resolve) => {
          const abortController = new AbortController();
          const startTime = performance.now();
          const timeoutId = setTimeout(() => {
            abortController.abort();
            resolve({ rpcUrl, success: false, duration: 0 });
          }, rpcTimeout);

          fetch(rpcUrl, {
            method: "POST",
            headers: Object.assign({}, rpcHeader, { "Content-Type": "application/json" }),
            body: rpcBody,
            signal: abortController.signal,
          })
            .then(() => {
              clearTimeout(timeoutId);
              const endTime = performance.now();
              resolve({
                rpcUrl,
                duration: endTime - startTime,
                success: true,
              } as PromiseResult);
            })
            .catch(() => {
              clearTimeout(timeoutId);
              resolve({ rpcUrl, success: false, duration: 0 });
            });
        })
    );

    const fastest = await Promise.race(successfulPromises);

    if (fastest.success) {
      latencies[`${networkId}__${fastest.rpcUrl}`] = fastest.duration;
    }

    try {
      const allResults = await Promise.allSettled(successfulPromises);

      allResults.forEach((result) => {
        if (result.status === "fulfilled" && (result.value as PromiseResult).success) {
          latencies[`${networkId}__${(result.value as PromiseResult).rpcUrl}`] = (result.value as PromiseResult).duration;
        } else if (result.status === "fulfilled") {
          const fulfilledResult = result.value as PromiseResult;
          const index = runtimeRpcs.indexOf(fulfilledResult.rpcUrl);
          if (index > -1) {
            runtimeRpcs.splice(index, 1);
          }
        }
      });

      return { latencies, runtimeRpcs };
    } catch (err) {
      console.error("[RPCService] Failed to test RPC performance");
    }
    return { latencies, runtimeRpcs };
  }

  static async findFastestRpc(latencies: Record<string, number>, networkId: number): Promise<string | null> {
    if (Object.keys(latencies).length === 0) {
      console.error("[RPCService] Latencies object is empty");
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
        ); // Add index signature for validLatencies object

      return Object.keys(validLatencies)
        .reduce((a, b) => (validLatencies[a] < validLatencies[b] ? a : b))
        .split("__")[1];
    } catch (error) {
      console.error("[RPCService] Failed to find fastest RPC");
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
