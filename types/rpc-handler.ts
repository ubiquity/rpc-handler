import { JsonRpcProvider } from "@ethersproject/providers";
import { LOCAL_HOST, networkRpcs, networkIds } from "./constants";
import { HandlerInterface, HandlerConstructorConfig, NetworkId, NetworkName, Rpc, Tracking, getRpcUrls } from "./handler";

import { RPCService } from "../src/services/rpc-service";
import { StorageService } from "../src/services/storage-service";
import { Metadata, PrettyLogs, PrettyLogsWithOk } from "./logs";

export class RPCHandler implements HandlerInterface {
  private static _instance: RPCHandler | null = null;
  private _provider: JsonRpcProvider | null = null;
  private _networkId: NetworkId;
  private _networkName: NetworkName;
  private _env: string = "node";

  private _rpcTimeout: number = Number.MAX_SAFE_INTEGER; // ms
  private _cacheRefreshCycles: number = 10;
  private _refreshLatencies: number = 0;
  private _autoStorage: boolean = false;

  private _runtimeRpcs: string[] = [];
  private _latencies: Record<string, number> = {};

  private _networkRpcs: Rpc[];

  private _proxySettings: HandlerConstructorConfig["proxySettings"] = {
    retryCount: 3,
    retryDelay: 500,
    logTier: "ok",
    logger: new PrettyLogs(),
    strictLogs: true,
  };

  constructor(config: HandlerConstructorConfig) {
    this._networkId = config.networkId;
    this._networkRpcs = this._filterRpcs(networkRpcs[this._networkId].rpcs, config.tracking || "yes");
    this._networkName = networkIds[this._networkId];

    this.log.bind(this);
    this.metadataMaker.bind(this);
    this.createProviderProxy.bind(this);
    this.getProvider.bind(this);
    this.getFastestRpcProvider.bind(this);
    this.getLatencies.bind(this);
    this.getRefreshLatencies.bind(this);
    this.getCacheRefreshCycles.bind(this);
    this.getRuntimeRpcs.bind(this);
    this.getNetworkId.bind(this);
    this.getNetworkName.bind(this);
    this.getNetworkRpcs.bind(this);
    this.testRpcPerformance.bind(this);
    this._initialize(config);
  }

  public async getFastestRpcProvider(): Promise<JsonRpcProvider> {
    let fastest;
    if (this._networkId === "31337" || this._networkId === "1337") {
      fastest = new JsonRpcProvider(LOCAL_HOST, this._networkId);
    } else if (!fastest) {
      fastest = await this.testRpcPerformance();
    }

    if (fastest && fastest?.connection.url.includes("localhost") && !(this._networkId === "31337" || this._networkId === "1337")) {
      /**
       * The JsonRpcProvider defaults erroneously to localhost:8545
       * this is a fix for that
       *  static defaultUrl(): string {
       *    return "http:/\/localhost:8545";
       *  }
       */
      fastest = await this.testRpcPerformance();
    }

    this._provider = this.createProviderProxy(fastest, this);
    this.log("ok", `[${this._proxySettings.moduleName}] Provider initialized: `, { provider: this._provider?.connection.url });
    this.log("info", `[${this._proxySettings.moduleName}]`, { latencies: this._latencies });

    return this._provider;
  }

  createProviderProxy(provider: JsonRpcProvider, handler: RPCHandler): JsonRpcProvider {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return new Proxy(provider, {
      get: function (target: JsonRpcProvider, prop: keyof JsonRpcProvider) {
        if (typeof target[prop] === "function") {
          let error: Error | unknown | null = null;

          const isPromiseLike: boolean = target[prop] instanceof Promise;
          const isAsync: boolean = target[prop].constructor.name === "AsyncFunction";

          if (isPromiseLike || isAsync) {
            try {
              return self.asyncRequest(target, prop, self);
            } catch (e) {
              error = e;
            }
          }

          if (error) {
            self.log(
              "error",
              `Exhausted all RPCS with asyncRequest, trying syncRequest`,
              self.metadataMaker(error, prop as string, [], { targetUrl: target.connection.url })
            );
            error = null;
          }

          try {
            return self.syncRequest(target, prop, self);
          } catch (e) {
            error = e;
          }

          if (error) {
            handler.log(
              "error",
              "Exhausted all attempts to call provider method",
              handler.metadataMaker(error, prop as string, [], { targetUrl: target.connection.url })
            );
          }
        }

        return target[prop];
      },
    });
  }

  asyncRequest(target: JsonRpcProvider, prop: keyof JsonRpcProvider, handler: RPCHandler): (...args: unknown[]) => unknown {
    handler.log("verbose", `Calling provider method ${prop}`);
    return async function (...args: unknown[]) {
      try {
        return await (target[prop] as (...args: unknown[]) => Promise<unknown>)(...args);
      } catch (e) {
        handler.log("info", `Failed to call provider method ${prop}, retrying...`, handler.metadataMaker(e, prop as string, args));
      }

      const latencies: Record<string, number> = handler.getLatencies();
      const sortedLatencies = Object.entries(latencies).sort((a, b) => a[1] - b[1]);

      let loops = handler._proxySettings.retryCount;

      let lastError: Error | unknown | null = null;

      while (loops > 0) {
        for (const [rpc] of sortedLatencies) {
          handler.log("info", `Connected to: ${rpc}`);
          try {
            const newProvider = new JsonRpcProvider(rpc.split("__")[1]);
            return await (newProvider[prop] as (...args: unknown[]) => Promise<unknown>)(...args);
          } catch (e) {
            handler.log("error", `Failed to call provider method ${prop}`, handler.metadataMaker(e, prop as string, args));
            lastError = e;

            await new Promise((resolve) => setTimeout(resolve, handler._proxySettings.retryDelay));
          }
        }
        loops--;
      }

      if (lastError) {
        return lastError;
      }
    };
  }

  syncRequest(target: JsonRpcProvider, prop: keyof JsonRpcProvider, handler: RPCHandler) {
    handler.log("verbose", `Calling provider method ${prop}`);
    return function (...args: unknown[]): unknown {
      try {
        return (target[prop] as (...args: unknown[]) => unknown)(...args);
      } catch (e) {
        handler.log("info", `Failed to call provider method`, handler.metadataMaker(e, prop as string, args, { targetUrl: target.connection.url }));
      }

      const latencies: Record<string, number> = handler.getLatencies();
      const sortedLatencies = Object.entries(latencies).sort((a, b) => a[1] - b[1]);

      let loops = handler._proxySettings.retryCount;

      let lastError: Error | unknown | null = null;

      while (loops > 0) {
        for (const [rpc] of sortedLatencies) {
          handler.log("info", `Retrying with: ${rpc}`);
          const newProvider = new JsonRpcProvider(rpc.split("__")[1]);
          try {
            return (newProvider[prop] as (...args: unknown[]) => unknown)(...args);
          } catch (e) {
            handler.log(
              "error",
              `Failed to call provider method ${prop}`,
              handler.metadataMaker(e, prop as string, args, { providerUrl: newProvider.connection.url })
            );
            lastError = e;

            setTimeout(() => { }, handler._proxySettings.retryDelay);
          }
        }
        loops--;
      }

      if (lastError) {
        return lastError;
      }
    };
  }

  metadataMaker(error: Error | unknown, method: string, args: unknown[], obj?: unknown[] | unknown): Metadata {
    const err = error instanceof Error ? error : undefined;
    if (err) {
      return {
        error: err,
        method,
        args,
        obj,
      };
    } else {
      return {
        method,
        args,
        obj,
      };
    }
  }

  public async testRpcPerformance(): Promise<JsonRpcProvider> {
    const shouldRefreshRpcs =
      Object.keys(this._latencies).filter((rpc) => rpc.startsWith(`${this._networkId}__`)).length <= 1 || this._refreshLatencies >= this._cacheRefreshCycles;

    if (shouldRefreshRpcs) {
      this._runtimeRpcs = getRpcUrls(this._networkRpcs);
      this._refreshLatencies = 0;
    } else {
      this._runtimeRpcs = Object.keys(this._latencies).map((rpc) => {
        return rpc.split("__")[1];
      });
    }

    await this._testRpcPerformance();

    const fastestRpcUrl = await RPCService.findFastestRpc(this._latencies, this._networkId);

    if (!fastestRpcUrl) {
      throw this.log(
        "fatal",
        "Failed to find fastest RPC",
        this.metadataMaker(new Error("No RPCs available"), "testRpcPerformance", [], { latencies: this._latencies, networkId: this._networkId })
      );
    }

    this._provider = this.createProviderProxy(new JsonRpcProvider(fastestRpcUrl, Number(this._networkId)), this);

    if (this._autoStorage) {
      StorageService.setLatencies(this._env, this._latencies);
      StorageService.setRefreshLatencies(this._env, this._refreshLatencies);
    }

    if (!this._provider) {
      throw this.log(
        "fatal",
        "Failed to create provider",
        this.metadataMaker(new Error("No provider available"), "testRpcPerformance", [], {
          latencies: this._latencies,
          fastestRpcUrl: fastestRpcUrl,
        })
      );
    }

    return this._provider;
  }

  public getProvider(): JsonRpcProvider {
    if (!this._provider) {
      throw this.log(
        "fatal",
        "Provider is not initialized",
        this.metadataMaker(new Error("Provider is not initialized"), "getProvider", [], {
          networkRpcs: this._networkRpcs,
          runtimeRpcs: this._runtimeRpcs,
          latencies: this._latencies,
        })
      );
    }
    return this._provider;
  }

  public static getInstance(config: HandlerConstructorConfig): RPCHandler {
    if (!RPCHandler._instance) {
      if (!config) {
        throw new Error("Config is required to initialize RPCHandler");
      }

      RPCHandler._instance = new RPCHandler(config);
    }
    return RPCHandler._instance;
  }

  public clearInstance(): void {
    RPCHandler._instance = null;
  }

  public getRuntimeRpcs(): string[] {
    return this._runtimeRpcs;
  }

  public getNetworkId() {
    return this._networkId;
  }

  public getNetworkName() {
    return this._networkName;
  }

  public getNetworkRpcs(): Rpc[] {
    return this._networkRpcs;
  }

  public getLatencies(): Record<string, number> {
    return this._latencies;
  }

  public getRefreshLatencies(): number {
    return this._refreshLatencies;
  }

  public getCacheRefreshCycles(): number {
    return this._cacheRefreshCycles;
  }

  private async _testRpcPerformance(): Promise<void> {
    const { latencies, runtimeRpcs } = await RPCService.testRpcPerformance(
      this._networkId,
      this._latencies,
      this._runtimeRpcs,
      { "Content-Type": "application/json" },
      JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBlockByNumber",
        params: ["latest", false],
        id: 1,
      }),
      this._rpcTimeout
    );

    this._runtimeRpcs = runtimeRpcs;
    this._latencies = latencies;
    this._refreshLatencies++;

    StorageService.setLatencies(this._env, this._latencies);
    StorageService.setRefreshLatencies(this._env, this._refreshLatencies);
  }

  log(tier: PrettyLogsWithOk, message: string, obj?: Metadata): void {
    if (!this._proxySettings?.logger) {
      this._proxySettings.logger = new PrettyLogs();
    }

    let logTier = this._proxySettings?.logTier;

    if (!logTier) {
      this._proxySettings.logTier = "error";
      logTier = this._proxySettings.logTier;
      this._proxySettings.logger.log("error", "Log tier is not set, defaulting to error");
    }

    const isStrict = this._proxySettings.strictLogs;

    if (isStrict && logTier === tier) {
      this._proxySettings.logger[tier](message, obj);
    } else if (logTier === "verbose" || !isStrict) {
      this._proxySettings.logger.log(tier, message, obj);
    }
  }

  private _updateConfig(config: HandlerConstructorConfig): void {
    if (config.proxySettings) {
      this._proxySettings = {
        ...this._proxySettings,
        ...config.proxySettings,
        // ensuring the logger is not null
        logger: config.proxySettings.logger || this._proxySettings.logger,
        logTier: config.proxySettings.logTier || this._proxySettings.logTier,
      };
    }

    if (config.networkName) {
      this._networkName = config.networkName;
    }

    if (config.networkRpcs) {
      if (this._networkId === "31337") {
        this._networkRpcs = [LOCAL_HOST];
      }
      this._networkRpcs = [...this._networkRpcs, ...config.networkRpcs];
    }

    if (config.runtimeRpcs) {
      this._runtimeRpcs = config.runtimeRpcs;
    }

    if (config.cacheRefreshCycles) {
      this._cacheRefreshCycles = config.cacheRefreshCycles;
    }

    if (config.rpcTimeout) {
      this._rpcTimeout = config.rpcTimeout;
    }

    if (config.autoStorage) {
      this._autoStorage = true;
      this._latencies = StorageService.getLatencies(this._env, this._networkId);
      this._refreshLatencies = StorageService.getRefreshLatencies(this._env);
    }
  }

  private _filterRpcs(networks: Rpc[], tracking: Tracking) {
    return networks.filter((rpc) => {
      if (tracking == "yes") {
        return true;
      } else if (tracking == "limited") {
        return rpc.tracking == "limited" || rpc.tracking == "none";
      } else if (tracking == "none") {
        return rpc.tracking == "none";
      }
      return false;
    });
  }

  private _initialize(config: HandlerConstructorConfig): void {
    this._env = typeof window === "undefined" ? "node" : "browser";
    this._updateConfig(config);
  }
}
