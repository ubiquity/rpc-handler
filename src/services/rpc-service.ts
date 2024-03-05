import { ValidBlockData } from "../handler";
import axios from "axios";
import { StorageService } from "./storage-service";

export class RPCService {
  static async testRpcPerformance(
    networkId: number,
    latencies: Record<string, number>,
    runtimeRpcs: string[],
    rpcHeader: object,
    rpcBody: string,
    env: string
  ): Promise<{ latencies: Record<string, number>; runtimeRpcs: string[] }> {
    const successfulPromises = runtimeRpcs.map(
      (rpcUrl) =>
        new Promise((resolve) => {
          const startTime = performance.now();
          axios
            .post(rpcUrl, rpcBody, {
              headers: rpcHeader,
              cancelToken: new axios.CancelToken((c) => setTimeout(() => c("Request Timeout"), 500)),
            })
            .then(() => {
              const endTime = performance.now();
              resolve({
                rpcUrl,
                duration: endTime - startTime,
                success: true,
              });
            })
            .catch(() => {
              resolve({ rpcUrl, success: false });
            });
        })
    );
    type PromiseResult = { success: boolean; rpcUrl: string; duration: number };

    const fastest = (await Promise.race(successfulPromises)) as PromiseResult;

    if (fastest.success) {
      latencies[`${fastest.rpcUrl}_${networkId}`] = fastest.duration;
    }

    const allResults = await Promise.allSettled(successfulPromises);

    allResults.forEach((result) => {
      if (result.status === "fulfilled" && (result.value as PromiseResult).success) {
        latencies[`${(result.value as PromiseResult).rpcUrl}_${networkId}`] = (result.value as PromiseResult).duration;
      } else if (result.status === "fulfilled") {
        const fulfilledResult = result.value as PromiseResult;
        const index = runtimeRpcs.indexOf(fulfilledResult.rpcUrl);
        if (index > -1) {
          runtimeRpcs.splice(index, 1);
        }
      }
    });

    StorageService.setLatencies(env, latencies);

    return { latencies, runtimeRpcs };
  }

  static findFastestRpc(latencies: Record<string, number>, networkId: number): string {
    const validLatencies: Record<string, number> = Object.entries(latencies)
      .filter(([key]) => key.endsWith(`_${networkId}`))
      .reduce(
        (acc, [key, value]) => {
          acc[key] = value;
          return acc;
        },
        {} as Record<string, number>
      ); // Add index signature for validLatencies object

    try {
      return Object.keys(validLatencies)
        .reduce((a, b) => (validLatencies[a] < validLatencies[b] ? a : b))
        .split("_")[0];
    } catch (error) {
      return "";
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
