import { JsonRpcProvider } from "@ethersproject/providers";
import { LOCAL_HOST, networkRpcs } from "./constants";
import { HandlerInterface } from "handler";

import { RPCService } from "./services/RPCService";
import { StorageService } from "./services/StorageService";

export class RPCHandler implements HandlerInterface {
  private static _instance: RPCHandler | null = null;
  private _provider: JsonRpcProvider;
  private _networkId: number;
  private _env: string = "node";

  private _cacheRefreshCycles: number;
  private _refreshLatencies: number = 0;

  private _runtimeRpcs: string[] = [];
  private _latencies: Record<string | number, number> = {};

  constructor(networkId: number, cacheRefreshCycles: number = 5) {
    this._networkId = networkId;
    this._provider = new JsonRpcProvider(networkRpcs[networkId][0], networkId);
    this._cacheRefreshCycles = cacheRefreshCycles;

    this._initialize();
  }

  private _initialize() {
    this._env = typeof window === "undefined" ? "node" : "browser";
    this._latencies = StorageService.getLatencies(this._env);
    this._refreshLatencies = StorageService.getRefreshLatencies(this._env);

    this.testRpcPerformance(this._networkId).catch(console.error);
  }

  public static getInstance(networkId: number, cacheRefreshCycles?: number): RPCHandler {
    if (!RPCHandler._instance) {
      RPCHandler._instance = new RPCHandler(networkId, cacheRefreshCycles);
    }
    return RPCHandler._instance;
  }
  public clearInstance(): void {
    RPCHandler._instance = null;
  }

  public getProvider(): JsonRpcProvider {
    return this._provider;
  }

  public async getFastestRpcProvider(networkId?: number): Promise<JsonRpcProvider> {
    !networkId && (networkId = this._networkId);

    if (networkId === 31337) {
      return new JsonRpcProvider(LOCAL_HOST, {
        name: LOCAL_HOST,
        chainId: 31337,
      });
    }

    return await this.testRpcPerformance(networkId);
  }

  public async testRpcPerformance(networkId: number): Promise<JsonRpcProvider> {
    const shouldRefreshRpcs =
      Object.keys(this._latencies).filter((rpc) => rpc.endsWith(`_${networkId}`)).length <= 1 || this._refreshLatencies >= this._cacheRefreshCycles;

    if (shouldRefreshRpcs) {
      this._refreshLatencies = 0;
      this._latencies = {};
    }

    this._runtimeRpcs = shouldRefreshRpcs
      ? networkRpcs[networkId]
      : // use cached otherwise
        Object.keys(this._latencies).map((rpc) => {
          if (rpc.includes("api_key") && rpc.endsWith(`_${networkId}`)) {
            return rpc.replace(`_${networkId}`, "");
          }

          return rpc.split("_")[0];
        });

    await this._testRpcPerformance(networkId).then(() => {
      const fastestRpcUrl = RPCService.findFastestRpc(this._latencies, this._networkId);
      this._provider = new JsonRpcProvider(fastestRpcUrl, this._networkId);
    });

    return this._provider;
  }

  private async _testRpcPerformance(networkId: number): Promise<void> {
    const { latencies, runtimeRpcs } = await RPCService.testRpcPerformance(
      networkId,
      this._latencies,
      this._runtimeRpcs,
      { "Content-Type": "application/json" },
      JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBlockByNumber",
        params: ["latest", false],
        id: 1,
      }),
      this._env
    );

    this._runtimeRpcs = runtimeRpcs;
    this._latencies = latencies;
    this._refreshLatencies++;

    StorageService.setLatencies(this._env, this._latencies);
    StorageService.setRefreshLatencies(this._env, this._refreshLatencies);
  }
}
