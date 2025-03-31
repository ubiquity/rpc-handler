// import type { Address } from "viem"; // Removed - not used internally
import { CacheManager } from "./cache-manager.ts";
import { ChainlistDataSource } from "./chainlist-data-source.ts";
// import { readContract } from "./contract-utils.ts"; // Removed - not used internally
import { LatencyTester } from "./latency-tester.ts";
import { RpcSelector } from "./rpc-selector.ts";

// Uncommented JSON-RPC interfaces
interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any[];
  id: number | string;
}
interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

export interface Permit2RpcManagerOptions {
  cacheTtlMs?: number;
  latencyTimeoutMs?: number;
  requestTimeoutMs?: number;
  nodeCachePath?: string;
  localStorageKey?: string; // Used as KV key prefix
  logLevel?: "debug" | "info" | "warn" | "error" | "none";
  initialRpcData?: { rpcs: { [chainId: string]: string[] } };
  disableCache?: boolean; // Option to disable caching for testing
}

const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
const DEFAULT_LOG_LEVEL = "warn";

const LOG_LEVEL_HIERARCHY: Record<NonNullable<Permit2RpcManagerOptions["logLevel"]>, number> = {
  debug: 0, info: 1, warn: 2, error: 3, none: 4,
};

export class Permit2RpcManager {
  private dataSource: ChainlistDataSource;
  private cacheManager: CacheManager;
  private latencyTester: LatencyTester;
  public rpcSelector: RpcSelector;
  private requestTimeoutMs: number;
  private logLevel: NonNullable<Permit2RpcManagerOptions["logLevel"]>;
  private configuredLogLevelValue: number;
  private rpcIndexMap = new Map<number, number>(); // Map to track next RPC index per chain

  constructor(options: Permit2RpcManagerOptions = {}) {
    this.logLevel = options.logLevel ?? DEFAULT_LOG_LEVEL;
    this.configuredLogLevelValue = LOG_LEVEL_HIERARCHY[this.logLevel];
    const logger = this._log.bind(this);

    this.dataSource = new ChainlistDataSource(logger, options.initialRpcData);
    this.cacheManager = new CacheManager({
      cacheTtlMs: options.cacheTtlMs,
      localStorageKey: options.localStorageKey,
      logger: logger,
      disableCache: options.disableCache, // Pass disableCache option
    });
    this.latencyTester = new LatencyTester(options.latencyTimeoutMs, logger);
    this.rpcSelector = new RpcSelector(this.dataSource, this.cacheManager, this.latencyTester, logger);
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  }

  private _log(level: "debug" | "info" | "warn" | "error", message: string, ...optionalParams: any[]): void {
    if (this.logLevel === "none") return;
    const messageLevelValue = LOG_LEVEL_HIERARCHY[level];
    if (messageLevelValue >= this.configuredLogLevelValue) {
      const logFn = console[level] || console.log;
      logFn(`[Permit2RPC:${level}] ${message}`, ...optionalParams);
    }
  }

  /**
   * Sends a JSON-RPC request, trying available RPCs in a round-robin fashion based on the ranked list.
   * Handles fallback by iterating through the list.
   */
  async send<T = any>(chainId: number, method: string, params: any[] = []): Promise<T> {
    const rankedRpcList = await this.rpcSelector.getRankedRpcList(chainId);

    if (rankedRpcList.length === 0) {
      this._log("error", `No available RPC endpoints found for chainId ${chainId}. Cannot send request.`);
      throw new Error(`No available RPC endpoints found for chainId ${chainId}.`);
    }

    // --- Round-Robin Start Index ---
    const currentIndex = this.rpcIndexMap.get(chainId) || 0;
    const startIndex = currentIndex % rankedRpcList.length; // Ensure start index is valid
    // Immediately update the index for the *next* concurrent call
    this.rpcIndexMap.set(chainId, (currentIndex + 1) % rankedRpcList.length);
    this._log("debug", `Starting RPC attempt loop for chain ${chainId} at index ${startIndex} (of ${rankedRpcList.length}). Next call starts at index ${this.rpcIndexMap.get(chainId)}.`);
    // --- End Round-Robin ---

    let lastError: any = null;

    // Iterate through the ranked list, starting from startIndex, wrapping around once
    for (let i = 0; i < rankedRpcList.length; i++) {
      const listIndex = (startIndex + i) % rankedRpcList.length;
      const rpcUrl = rankedRpcList[listIndex];

      if (!rpcUrl) continue; // Should not happen, but safety check

      try {
        this._log("debug", `Attempt #${i + 1}: Trying RPC call to ${rpcUrl} for chain ${chainId}: ${method}`);
        const result = await this.executeRpcCall<T>(rpcUrl, method, params);
        this._log("debug", `RPC call successful for ${rpcUrl}`);
        return result; // Success! Return the result.
      } catch (error: any) {
        lastError = error;
        this._log("warn", `RPC call attempt failed for ${rpcUrl} (chain ${chainId}): ${error.message}. Trying next RPC...`);
        // Continue to the next RPC in the list
      }
    }

    // If the loop finishes, all RPCs failed.
    this._log("error", `All available RPC endpoints failed for chainId ${chainId} after ${rankedRpcList.length} attempts. Last error: ${lastError?.message}`);
    throw new Error(`All available RPC endpoints failed for chainId ${chainId}. Last error: ${lastError?.message}`);
  }

  /**
   * Executes a single JSON-RPC call to the specified URL.
   * Made public temporarily FOR TESTING PURPOSES ONLY.
   */
  public async executeRpcCall<T>(url: string, method: string, params: any[]): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    const requestBody: JsonRpcRequest = {
      jsonrpc: "2.0", method, params, id: `rpc-call-${Date.now()}`,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP error ${response.status} ${response.statusText}`);
      const responseData: JsonRpcResponse = await response.json();
      // Check if error exists before accessing its properties
      if (responseData.error) {
           throw new Error(`RPC error ${responseData.error.code}: ${responseData.error.message}`);
      }
      // Check if result is explicitly undefined (it could be null which is valid JSON-RPC)
      if (responseData.result === undefined) {
          this._log("warn", `RPC response for ${method} had undefined result.`);
          // Depending on expected behavior, might need to throw or return differently
      }
      // Cast should be safe now if no error was thrown
      return responseData.result as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") throw new Error(`Request timed out after ${this.requestTimeoutMs}ms`);
      throw error;
    }
  }
}

// --- Example Usage Removed ---
