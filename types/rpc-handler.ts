import { JsonRpcProvider } from "@ethersproject/providers";
import { LOCAL_HOST, networkRpcs, networkIds, LOCAL_HOST_2 } from "./constants";
import { HandlerInterface, HandlerConstructorConfig, NetworkId, NetworkName, Rpc, Tracking, getRpcUrls } from "./handler";
import { Metadata, PrettyLogs, PrettyLogsWithOk } from "./logs";
import { PromiseResult, RequestPayload, RPCService } from "./rpc-service";
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
  private _rpcService: RPCService;
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
    this.consensusCall.bind(this);
    this.getFirstAvailableRpcProvider.bind(this);
    this._rpcService = new RPCService(this);
  }

  /**
   * @NOTICE # This method is intended for read operations only.
   * Performing write operations with this method is dangerous as it is executed and confirmed by potentially all supported network providers.
   *
   * @DEV `quorumThreshold` is a template literal to enforce at the type level that the value is a decimal
   * between 0 and 1 without the need for external packages or custom classes which burden the user and codebase.
   *
   * @DESCRIPTION Similar to `Ethers.FallbackProvider`, this method validates the response from multiple nodes and returns true if the response is consistent across all nodes above the quorum threshold.
   *
   * @EXAMPLE
   * - `consensusCall({ method: "eth_blockNumber", params: [] }, "0.5")`
   * - `consensusCall({ method: "eth_getTransactionByHash", params: ["0x1234"] }, "0.8")`
   */
  public async consensusCall<TMethodReturnData = unknown>(requestPayload: RequestPayload, quorumThreshold: `0.${number}`): Promise<TMethodReturnData> {
    if (this._runtimeRpcs.length === 0) {
      await this.testRpcPerformance();
    }

    if (this._runtimeRpcs.length === 1) {
      throw new Error("Only one RPC available, could not reach consensus");
    }

    const quorum = Math.ceil(this._runtimeRpcs.length * Number(quorumThreshold));
    const rpcs = this._runtimeRpcs;
    const results: PromiseResult[] = [];

    for (const rpc of rpcs) {
      try {
        const result = await this._rpcService.makeRpcRequest(requestPayload, { rpcUrl: rpc, rpcTimeout: this._rpcTimeout });
        if (result.success) {
          results.push(result);
        }
      } catch (err) {
        this.log("error", `Failed to reach endpoint ${rpc}.\n ${String(err)}`);
      }
    }

    if (results.length < quorum) {
      throw new Error(`Failed to reach consensus of ${quorum} with ${results.length} successful RPC responses`);
    }

    const rpcResults = results.map((res) => res.data?.result);

    let hadToStringify;

    const matchingResults = rpcResults.reduce(
      (acc, val) => {
        if (!val) return acc;
        if (typeof val !== "string") {
          if (val instanceof Error) {
            val = val.message;
          } else if ("error" in val) {
            hadToStringify = typeof val.error !== "string";
            val = hadToStringify ? JSON.stringify(val.error) : (val.error as string);
            console.log("val", val);
          } else {
            val = val.hash;
          }
        }
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const consensusResults = Object.entries(matchingResults).reduce((acc, [key, val]) => {
      if (val >= quorum) {
        acc.push(key);
      }
      return acc;
    }, [] as string[]);

    if (consensusResults.length === 0) {
      throw new Error(`Failed to reach consensus with ${quorum} matching results`);
    } else if (consensusResults.length > 1) {
      throw new Error(`Multiple consensus results found: ${JSON.stringify(consensusResults)}`);
    }

    const consensus = consensusResults[0];

    this.log("ok", `[${this._proxySettings.moduleName}] Consensus reached`, { consensus, confirmedNodes: matchingResults[consensus] });

    if (hadToStringify) {
      return JSON.parse(consensus) as TMethodReturnData;
    }

    return consensus as TMethodReturnData;
  }

  /**
   * Loops through all RPCs for a given network id and returns a provider with the first successful network.
   */
  public async getFirstAvailableRpcProvider() {
    const rpcList = [...networkRpcs[this._networkId].rpcs].filter((rpc) => rpc.url.includes("https"));
    shuffleArray(rpcList);
    const rpcPromises: Record<string, Promise<PromiseResult>[]> = {};

    for (const rpc of rpcList) {
      this._rpcService.createBlockReqAndByteCodeRacePromises(this._runtimeRpcs, rpcPromises, this._rpcTimeout);
      const results = await Promise.allSettled(rpcPromises[rpc.url] ?? []);
      const hasPassedAllChecks = results.every((res) => res && res.status === "fulfilled" && res.value.success);
      if (hasPassedAllChecks) {
        return new JsonRpcProvider({ url: rpc.url, skipFetchSetup: true }, Number(this._networkId));
      }
    }

    this.log("fatal", `[${this._proxySettings.moduleName}] Failed to find a working RPC`, { rpcList });
    return null;
  }

  public async getFastestRpcProvider(): Promise<JsonRpcProvider> {
    let fastest = await this.testRpcPerformance();

    if (fastest && fastest?.connection.url.includes("localhost") && !(this._networkId === "31337" || this._networkId === "1337")) {
      fastest = await this.testRpcPerformance();
    }

    this._provider = this.createProviderProxy(fastest, this);
    this.log("ok", `[${this._proxySettings.moduleName}] Provider initialized: `, { provider: this._provider?.connection.url });
    this.log("info", `[${this._proxySettings.moduleName}]`, { runTimeRpcs: this._runtimeRpcs, latencies: this._latencies });

    return this._provider;
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
    if (this._proxySettings.disabled) return provider;

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
                  `[${handler._proxySettings.moduleName}] Successfully called provider method ${prop.toString()}`,
                  handler.metadataMaker(response, prop as string, args, { rpc: target.connection.url })
                );
                return response;
              }
            } catch (e) {
              // first attempt with currently connected provider
              handler.log(
                "error",
                `[${handler._proxySettings.moduleName}] Failed to call provider method ${prop.toString()}, retrying...`,
                handler.metadataMaker(e, prop as string, args, { rpc: target.connection.url })
              );
            }

            const latencies: Record<string, number> = handler.getLatencies();
            const sortedLatencies = Object.entries(latencies).sort((a, b) => a[1] - b[1]);

            if (!sortedLatencies.length) {
              throw handler.log(
                "fatal",
                `[${handler._proxySettings.moduleName}] ${NO_RPCS_AVAILABLE}`,
                handler.metadataMaker(String(new Error(NO_RPCS_AVAILABLE)), "createProviderProxy", args, { sortedLatencies, networks: handler._networkRpcs })
              );
            }

            handler.log(
              "debug",
              `[${handler._proxySettings.moduleName}] Current provider failed, retrying with next fastest provider...`,
              handler.metadataMaker({}, prop.toString(), [], args)
            );

            // how many times we'll loop the whole list of RPCs
            let loops = handler._proxySettings.retryCount;
            let newProvider: JsonRpcProvider;
            let res: null | unknown = null;

            while (loops > 0) {
              for (const [rpc] of sortedLatencies) {
                handler.log("debug", `[${handler._proxySettings.moduleName}] Connected to: ${rpc}`);
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
                      `[${handler._proxySettings.moduleName}] Successfully called provider method ${prop.toString()}`,
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
                      `[${handler._proxySettings.moduleName}] Failed to call provider method ${prop.toString()} after ${handler._proxySettings.retryCount} attempts`,
                      handler.metadataMaker(e, prop as string, args)
                    );
                    throw e;
                  } else {
                    handler.log("debug", `[${handler._proxySettings.moduleName}] Retrying in ${handler._proxySettings.retryDelay}ms...`);
                    handler.log("debug", `[${handler._proxySettings.moduleName}] Call number: ${handler._proxySettings.retryCount - loops + 1}`);

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
    const fastestRpcUrl = this._findFastestRpcFromLatencies();

    if (!fastestRpcUrl) {
      throw this.log(
        "fatal",
        `[${this._proxySettings.moduleName}] Failed to find fastest RPC`,
        this.metadataMaker(String(new Error(NO_RPCS_AVAILABLE)), "testRpcPerformance", [], { latencies: this._latencies, networkId: this._networkId })
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
        `[${this._proxySettings.moduleName}] Failed to create provider`,
        this.metadataMaker(String(new Error("No provider available")), "testRpcPerformance", [], {
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
        `[${this._proxySettings.moduleName}] Provider is not initialized`,
        this.metadataMaker(String(new Error("Provider is not initialized")), "getProvider", [], {
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
    const { latencies, runtimeRpcs } = await this._rpcService.testRpcPerformance({
      latencies: this._latencies,
      networkId: this._networkId,
      rpcTimeout: this._rpcTimeout,
      runtimeRpcs: this._runtimeRpcs,
    });

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
      this._proxySettings.logger = new PrettyLogs();
    }

    let logTier = this._proxySettings?.logTier;

    if (!logTier) {
      this._proxySettings.logTier = "ok";
      logTier = this._proxySettings.logTier;
    } else if (logTier === "none") {
      return;
    }

    const isStrict = this._proxySettings.strictLogs;

    if (isStrict && logTier === tier) {
      // if strictLogs is true, only log the tier specified
      this._proxySettings.logger?.[tier](message, metadata);
    } else if (logTier === "verbose" || !isStrict) {
      // if strictLogs is false or tier is "verbose" log all logs
      this._proxySettings.logger?.log(tier, message, metadata);
    }

    if (tier === "fatal") {
      throw new Error(message + JSON.stringify(metadata));
    }
  }

  private _updateConfig(config: HandlerConstructorConfig): void {
    if (config.proxySettings) {
      this._proxySettings = {
        ...this._proxySettings,
        ...config.proxySettings,
        // ensuring the logger is not null
        logger: config.proxySettings.logger || this._proxySettings.logger,
        // ensuring the logTier is not null
        logTier: config.proxySettings.logTier || this._proxySettings.logTier,
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

  private _findFastestRpcFromLatencies(): string | null {
    try {
      const validLatencies: Record<string, number> = Object.entries(this._latencies)
        .filter(([key]) => key.startsWith(`${this._networkId}__`))
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
      this.log("error", "[RPCService] Failed to find fastest RPC", { er: String(error) });
      return null;
    }
  }
}
