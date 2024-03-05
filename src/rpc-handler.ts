import { JsonRpcProvider } from "@ethersproject/providers";
import { LOCAL_HOST, networkRpcs, tokens, networkIds, networkNames, networkCurrencies, networkExplorers, Token } from "./constants";
import { HandlerInterface, HandlerConstructorConfig } from "./handler";

import { RPCService } from "./services/rpc-service";
import { StorageService } from "./services/storage-service";

export class RPCHandler implements HandlerInterface {
  private static _instance: RPCHandler | null = null;
  private _provider: JsonRpcProvider | null = null;
  private _networkId: number;
  private _env: string = "node";

  private _cacheRefreshCycles: number = 10;
  private _refreshLatencies: number = 0;
  private _autoStorage: boolean = false;

  private _runtimeRpcs: string[] = [];
  private _latencies: Record<string | number, number> = {};

  private _networkIds = networkIds;
  private _tokens = tokens;
  private _networkNames = networkNames;
  private _networkCurrencies = networkCurrencies;
  private _networkRpcs = networkRpcs;
  private _networkExplorers = networkExplorers;

  constructor(networkId: number, config?: HandlerConstructorConfig) {
    this._networkId = networkId;
    this._initialize(config);
  }

  public async getFastestRpcProvider(networkId: number): Promise<JsonRpcProvider> {
    if (networkId === 31337) {
      this._provider = new JsonRpcProvider(LOCAL_HOST, networkId);
    } else {
      this._provider = await this.testRpcPerformance(networkId);
    }
    return this._provider;
  }

  public async testRpcPerformance(networkId: number): Promise<JsonRpcProvider> {
    const shouldRefreshRpcs =
      Object.keys(this._latencies).filter((rpc) => rpc.endsWith(`_${networkId}`)).length <= 1 || this._refreshLatencies >= this._cacheRefreshCycles;

    if (shouldRefreshRpcs) {
      this._runtimeRpcs = networkRpcs[networkId];
      this._refreshLatencies = 0;
    } else {
      this._runtimeRpcs = Object.keys(this._latencies).map((rpc) => {
        if (rpc.includes("api_key") && rpc.endsWith(`_${networkId}`)) {
          return rpc.replace(`_${networkId}`, "");
        }

        if ((networkId !== 31337 && rpc.includes("localhost")) || rpc.includes("127.0.0.1:8545")) {
          return rpc;
        }

        return rpc.split("_")[0];
      });
    }

    await this._testRpcPerformance(networkId);

    this._provider = new JsonRpcProvider(RPCService.findFastestRpc(this._latencies, networkId), networkId);

    if (this._autoStorage) {
      StorageService.setLatencies(this._env, this._latencies);
      StorageService.setRefreshLatencies(this._env, this._refreshLatencies);
    }

    return this._provider;
  }

  public findFastestRpc(): string {
    return RPCService.findFastestRpc(this._latencies, this._networkId);
  }

  public getProvider(): JsonRpcProvider {
    if (!this._provider) {
      if (Object.keys(this._latencies).length > 0) {
        this._provider = new JsonRpcProvider(RPCService.findFastestRpc(this._latencies, this._networkId), this._networkId);
      } else {
        throw new Error("Provider not initialized");
      }
    }
    return this._provider;
  }

  public static getInstance(networkId: number, config?: HandlerConstructorConfig): RPCHandler {
    if (!RPCHandler._instance) {
      RPCHandler._instance = new RPCHandler(networkId, config);
    }
    return RPCHandler._instance;
  }
  public clearInstance(): void {
    RPCHandler._instance = null;
  }

  public getRuntimeRpcs(): string[] {
    return this._runtimeRpcs;
  }

  public getNetworkId(): number {
    return this._networkId;
  }

  public getNetworkIds(): Record<string, number> {
    return this._networkIds;
  }

  public getTokens(): Record<number, Record<string, Token>> {
    return this._tokens;
  }

  public getNetworkNames(): Record<string, string> {
    return this._networkNames;
  }

  public getNetworkCurrencies(): Record<string, { symbol: string; decimals: number }> {
    return this._networkCurrencies;
  }

  public getNetworkExplorers(): Record<string, string> {
    return this._networkExplorers;
  }

  public getNetworkRpcs(): Record<string, string[]> {
    return this._networkRpcs;
  }

  public getLatencies(): Record<string | number, number> {
    return this._latencies;
  }

  public getRefreshLatencies(): number {
    return this._refreshLatencies;
  }

  public getCacheRefreshCycles(): number {
    return this._cacheRefreshCycles;
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
  }
  private _updateConfig(config: HandlerConstructorConfig): void {
    if (config.networkIds) {
      this._networkIds = { ...this._networkIds, ...config.networkIds };
    }

    if (config.tokens) {
      this._tokens = { ...this._tokens, ...config.tokens };
    }

    if (config.networkNames) {
      this._networkNames = { ...this._networkNames, ...config.networkNames };
    }

    if (config.networkCurrencies) {
      this._networkCurrencies = { ...this._networkCurrencies, ...config.networkCurrencies };
    }

    if (config.networkExplorers) {
      this._networkExplorers = { ...this._networkExplorers, ...config.networkExplorers };
    }

    if (config.networkRpcs) {
      this._networkRpcs = { ...this._networkRpcs, ...config.networkRpcs };
    }

    if (config.runtimeRpcs) {
      this._runtimeRpcs = config.runtimeRpcs;
    }

    if (config.cacheRefreshCycles) {
      this._cacheRefreshCycles = config.cacheRefreshCycles;
    }

    if (config.autoStorage) {
      this._autoStorage = true;
      this._latencies = StorageService.getLatencies(this._env);
      this._refreshLatencies = StorageService.getRefreshLatencies(this._env);
    }
  }

  private _initialize(config?: HandlerConstructorConfig): void {
    this._env = typeof window === "undefined" ? "node" : "browser";

    if (config) {
      this._updateConfig(config);
    }
  }
}
