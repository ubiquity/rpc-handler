import { ValidBlockData } from "handler";
export declare class RPCService {
  static testRpcPerformance(
    networkId: number,
    latencies: Record<string, number>,
    runtimeRpcs: string[],
    rpcHeader: object,
    rpcBody: string,
    env: string
  ): Promise<{
    latencies: Record<string, number>;
    runtimeRpcs: string[];
  }>;
  static findFastestRpc(latencies: Record<string, number>, networkId: number): string;
  static _raceUntilSuccess(
    promises: Promise<unknown>[],
    runtimeRpcs: string[],
    latencies: Record<string, number>
  ): Promise<{
    runtimeRpcs: string[];
    latencies: Record<string, number>;
  }>;
  static _verifyBlock(data: ValidBlockData): boolean;
}
