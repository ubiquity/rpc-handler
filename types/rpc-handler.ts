import { JsonRpcProvider } from "@ethersproject/providers";
import { LOCAL_HOST, networkRpcs, networkIds, LOCAL_HOST_2 } from "./constants";
import { HandlerInterface, HandlerConstructorConfig, NetworkId, NetworkName, Rpc, Tracking, getRpcUrls } from "./handler";
import { Metadata, PrettyLogs, PrettyLogsWithOk } from "./logs";
import { RPCService } from "./rpc-service";
import { StorageService } from "./storage-service";

const NO_RPCS_AVAILABLE = "No RPCs available";

function shuffleArray(array: object[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

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
    disabled: false,
    retryCount: 3,
    retryDelay: 100,
    logTier: "ok",
    logger: new PrettyLogs(),
    strictLogs: true,
    moduleName: "RPCHandler",
  };

  constructor(config: HandlerConstructorConfig) {
    this._networkId = config.networkId;
    this._networkRpcs = this._filterRpcs(networkRpcs[this._networkId].rpcs, config.tracking || "yes");

    const defaultExcluded: string[] = ["rpc.tenderly.co/fork/"];

    // build default exclusion list
    if (!config.exclusions) {
      config.exclusions = { searchTerms: defaultExcluded, overwriteDefaultExcluded: false };
    } else if (config.exclusions && !config.exclusions.overwriteDefaultExcluded) {
      // add default exclusions to their list
      config.exclusions.searchTerms = [...config.exclusions.searchTerms, ...defaultExcluded];
    }

    this._networkRpcs = this._networkRpcs.filter((rpc) => {
      if (config.exclusions) {
        return !config.exclusions.searchTerms.some((exclusion) => rpc.url.includes(exclusion));
      }
    });

    this._networkName = networkIds[this._networkId];

    this._initialize(config);
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
  }

  /**
   * Loops through all RPCs for a given network id and returns a provider with the first successful network.
   */
  public async getFirstAvailableRpcProvider() {
    const rpcList = [...networkRpcs[this._networkId].rpcs];
    shuffleArray(rpcList);
    for (const rpc of rpcList) {
      try {
        const result = await RPCService.makeRpcRequest(rpc.url, this._rpcTimeout, { "Content-Type": "application/json" });
        if (result.success) {
          return new JsonRpcProvider({ url: rpc.url, skipFetchSetup: true }, Number(this._networkId));
        } else {
          console.error(`Failed to reach endpoint ${rpc.url}. ${result.error}`);
        }
      } catch (err) {
        console.error(`Failed to reach endpoint ${rpc.url}. ${err}`);
      }
    }
    return null;
  }

  public async getFastestRpcProvider(): Promise<JsonRpcProvider> {
    let fastest = await this.testRpcPerformance();

    if (fastest && fastest?.connection.url.includes("localhost") && !(this._networkId === "31337" || this._networkId === "1337")) {
      fastest = await this.testRpcPerformance();
    }

    this._provider = this.createProviderProxy(fastest, this);
    this.log("ok", `[${this.proxySettings.moduleName}] Provider initialized: `, { provider: this._provider?.connection.url });
    this.log("info", `[${this.proxySettings.moduleName}]`, { latencies: this._latencies });

    return this._provider;
  }

  get proxySettings(): HandlerConstructorConfig["proxySettings"] {
    return this._proxySettings;
  }

  set proxySettings(value: HandlerConstructorConfig["proxySettings"]) {
    this._proxySettings = value;
  }

  /**
   * Creates a Proxy around the JsonRpcProvider to handle retries and logging
   *
   * If proxySettings.disabled, it will return the provider as is and
   * any retry or RPC reselection logic will be down to the user to implement
   */
  createProviderProxy(provider: JsonRpcProvider, handler: RPCHandler): JsonRpcProvider {
    /**
     * It is not recommended to disable this feature
     * unless you are handling retries and RPC reselection yourself
     */
    if (this.proxySettings.disabled) return provider;

    return new Proxy(provider, {
      get: function (target: JsonRpcProvider, prop: keyof JsonRpcProvider) {
        // if it's not a function, return the property
        if (typeof target[prop] !== "function") {
          return target[prop];
        }
        if (typeof target[prop] === "function") {
          // eslint-disable-next-line sonarjs/cognitive-complexity -- 16/15 is acceptable
          return async function (...args: unknown[]) {
            try {
              // responses are the value result of the method call if they are successful
              const response = await (target[prop] as (...args: unknown[]) => Promise<unknown>)(...args);

              if (response) {
                handler.log(
                  "verbose",
                  `[${handler.proxySettings.moduleName}] Successfully called provider method ${prop}`,
                  handler.metadataMaker(response, prop as string, args, { rpc: target.connection.url })
                );
                return response;
              }
            } catch (e) {
              // first attempt with currently connected provider
              handler.log(
                "error",
                `[${handler.proxySettings.moduleName}] Failed to call provider method ${prop}, retrying...`,
                handler.metadataMaker(e, prop as string, args, { rpc: target.connection.url })
              );
            }

            const latencies: Record<string, number> = handler.getLatencies();
            const sortedLatencies = Object.entries(latencies).sort((a, b) => a[1] - b[1]);

            if (!sortedLatencies.length) {
              throw handler.log(
                "fatal",
                `[${handler.proxySettings.moduleName}] ${NO_RPCS_AVAILABLE}`,
                handler.metadataMaker(new Error(NO_RPCS_AVAILABLE), "createProviderProxy", args, { sortedLatencies, networks: handler._networkRpcs })
              );
            }

            handler.log(
              "debug",
              `[${handler.proxySettings.moduleName}] Current provider failed, retrying with next fastest provider...`,
              handler.metadataMaker({}, prop, args)
            );

            // how many times we'll loop the whole list of RPCs
            let loops = handler._proxySettings.retryCount;
            let newProvider: JsonRpcProvider;
            let res: null | unknown = null;

            while (loops > 0) {
              for (const [rpc] of sortedLatencies) {
                handler.log("debug", `[${handler.proxySettings.moduleName}] Connected to: ${rpc}`);
                try {
                  newProvider = new JsonRpcProvider(
                    {
                      url: rpc.split("__")[1],
                      skipFetchSetup: true,
                    },
                    Number(handler._networkId)
                  );
                  const response = (await (newProvider[prop] as (...args: unknown[]) => Promise<unknown>)(...args)) as { result?: unknown; error?: unknown };

                  if (response) {
                    handler.log(
                      "verbose",
                      `[${handler.proxySettings.moduleName}] Successfully called provider method ${prop}`,
                      handler.metadataMaker(response, prop as string, args, { rpc })
                    );
                    res = response;

                    loops = 0;
                  }
                } catch (e) {
                  // last loop throw error
                  if (loops === 1) {
                    handler.log(
                      "fatal",
                      `[${handler.proxySettings.moduleName}] Failed to call provider method ${prop} after ${handler._proxySettings.retryCount} attempts`,
                      handler.metadataMaker(e, prop as string, args)
                    );
                    throw e;
                  } else {
                    handler.log("debug", `[${handler.proxySettings.moduleName}] Retrying in ${handler._proxySettings.retryDelay}ms...`);
                    handler.log("debug", `[${handler.proxySettings.moduleName}] Call number: ${handler._proxySettings.retryCount - loops + 1}`);

                    // delays here should be kept rather small
                    await new Promise((resolve) => setTimeout(resolve, handler._proxySettings.retryDelay));
                  }
                }
              }
              if (res) {
                break;
              }
              loops--;
            }

            return res;
          };
        }

        return target[prop]; // just in case
      },
    });
  }

  /**
   * runtimeRpcs are prefixed with the networkId so
   * they need to be stripped before being used
   */
  populateRuntimeFromNetwork(networkRpcs: string[]) {
    return networkRpcs.map((rpc) => {
      if (rpc.startsWith(`${this._networkId}__`)) {
        return rpc.split("__")[1];
      }

      return rpc;
    });
  }

  public async testRpcPerformance(): Promise<JsonRpcProvider> {
    const shouldRefreshRpcs =
      Object.keys(this._latencies).filter((rpc) => rpc.startsWith(`${this._networkId}__`)).length <= 1 || this._refreshLatencies >= this._cacheRefreshCycles;

    if (shouldRefreshRpcs) {
      this._runtimeRpcs = getRpcUrls(this._networkRpcs);
      // either the latencies are empty or we've reached the refresh cycle
      this._refreshLatencies = 0;
    } else if (this._latencies && Object.keys(this._latencies).length > 0) {
      // if we have latencies, we'll use them to populate the runtimeRpcs
      this._runtimeRpcs = this.populateRuntimeFromNetwork(Object.keys(this._latencies));
    } else if (this._runtimeRpcs.length === 0) {
      // if we have no latencies and no runtimeRpcs, we'll populate the runtimeRpcs from the networkRpcs
      this._runtimeRpcs = getRpcUrls(this._networkRpcs);
    }

    await this._testRpcPerformance();

    const fastestRpcUrl = await RPCService.findFastestRpc(this._latencies, this._networkId);

    if (!fastestRpcUrl) {
      throw this.log(
        "fatal",
        `[${this.proxySettings.moduleName}] Failed to find fastest RPC`,
        this.metadataMaker(new Error(NO_RPCS_AVAILABLE), "testRpcPerformance", [], { latencies: this._latencies, networkId: this._networkId })
      );
    }

    this._provider = this.createProviderProxy(new JsonRpcProvider({ url: fastestRpcUrl, skipFetchSetup: true }, Number(this._networkId)), this);

    if (this._autoStorage) {
      StorageService.setLatencies(this._env, this._latencies);
      StorageService.setRefreshLatencies(this._env, this._refreshLatencies);
    }

    if (!this._provider) {
      throw this.log(
        "fatal",
        `[${this.proxySettings.moduleName}] Failed to create provider`,
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
        `[${this.proxySettings.moduleName}] Provider is not initialized`,
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

  public getNetworkId(): NetworkId {
    return this._networkId;
  }

  public getNetworkName(): NetworkName {
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
      this._rpcTimeout
    );

    this._runtimeRpcs = runtimeRpcs;
    this._latencies = latencies;
    this._refreshLatencies++;

    StorageService.setLatencies(this._env, this._latencies);
    StorageService.setRefreshLatencies(this._env, this._refreshLatencies);
  }

  // creates metadata for logging
  metadataMaker(error: Error | unknown, method: string, args: unknown[], metadata?: unknown[] | unknown): Metadata {
    const err = error instanceof Error ? error : undefined;
    if (err) {
      return {
        error: err,
        method,
        args,
        metadata,
      };
    } else {
      return {
        method,
        args,
        metadata,
      };
    }
  }

  log(tier: PrettyLogsWithOk, message: string, metadata?: Metadata): void {
    if (!this._proxySettings?.logger) {
      this.proxySettings.logger = new PrettyLogs();
    }

    let logTier = this._proxySettings?.logTier;

    if (!logTier) {
      this.proxySettings.logTier = "ok";
      logTier = this.proxySettings.logTier;
    } else if (logTier === "none") {
      return;
    }

    const isStrict = this.proxySettings.strictLogs;

    if (isStrict && logTier === tier) {
      // if strictLogs is true, only log the tier specified
      this.proxySettings.logger?.[tier](message, metadata);
    } else if (logTier === "verbose" || !isStrict) {
      // if strictLogs is false or tier is "verbose" log all logs
      this.proxySettings.logger?.log(tier, message, metadata);
    }
  }

  private _updateConfig(config: HandlerConstructorConfig): void {
    if (config.proxySettings) {
      this._proxySettings = {
        ...this._proxySettings,
        ...config.proxySettings,
        // ensuring the logger is not null
        logger: config.proxySettings.logger || this.proxySettings.logger,
        // ensuring the logTier is not null
        logTier: config.proxySettings.logTier || this.proxySettings.logTier,
      };
    }

    if (config.networkName) {
      this._networkName = config.networkName;
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
    if (config.networkRpcs && config.networkRpcs.length > 0) {
      if (this._networkId === "31337" || this._networkId === "1337") {
        this._networkRpcs = [{ url: LOCAL_HOST }, { url: LOCAL_HOST_2 }];
      } else if (this._networkRpcs?.length > 0) {
        this._networkRpcs = [...this._networkRpcs, ...config.networkRpcs];
      } else {
        this._networkRpcs = config.networkRpcs;
      }
    }

    if (config.runtimeRpcs && config.runtimeRpcs.length > 0) {
      if (this._networkId === "31337" || this._networkId === "1337") {
        this._runtimeRpcs = [`${LOCAL_HOST}`, `${LOCAL_HOST_2}`, ...config.runtimeRpcs];
      } else if (this._runtimeRpcs?.length > 0) {
        this._runtimeRpcs = [...this._runtimeRpcs, ...config.runtimeRpcs];
      } else {
        this._runtimeRpcs = config.runtimeRpcs;
      }
    }

    this._updateConfig(config);
  }
}
