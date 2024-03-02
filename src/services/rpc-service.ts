import { ValidBlockData } from "handler";
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
    const promises = runtimeRpcs.map(async (rpcUrl) => {
      const startTime = performance.now();
      try {
        await axios.post(rpcUrl, rpcBody, { headers: rpcHeader, cancelToken: new axios.CancelToken((c) => setTimeout(() => c("Request Timeout"), 500)) });
        const endTime = performance.now();
        latencies[`${rpcUrl}_${networkId}`] = endTime - startTime;
      } catch (error) {
        delete latencies[`${rpcUrl}_${networkId}`];
        delete runtimeRpcs[runtimeRpcs.indexOf(rpcUrl)];
        StorageService.setLatencies(env, latencies);
      }
    });

    const { latencies: lats, runtimeRpcs: rpcs } = await this._raceUntilSuccess(promises, runtimeRpcs, latencies);

    return {
      latencies: lats,
      runtimeRpcs: rpcs,
    };
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

  static async _raceUntilSuccess(
    promises: Promise<unknown>[],
    runtimeRpcs: string[],
    latencies: Record<string, number>
  ): Promise<{ runtimeRpcs: string[]; latencies: Record<string, number> }> {
    new Promise((resolve) => {
      promises.forEach((promise: Promise<unknown>) => {
        promise.then(resolve).catch(() => {});
      });
    }).catch(console.error);

    return { runtimeRpcs, latencies };
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
