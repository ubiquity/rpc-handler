import type { Address } from "viem"; // Import viem types for example
import { CacheManager } from "./cache-manager.ts"; // Revert to .ts extension
import { ChainlistDataSource } from "./chainlist-data-source.ts"; // Revert to .ts extension
import { readContract } from "./contract-utils.ts"; // Revert to .ts extension
import { LatencyTester } from "./latency-tester.ts"; // Revert to .ts extension
import { RpcSelector } from "./rpc-selector.ts"; // Revert to .ts extension

// Re-define JSON-RPC request/response interfaces (or import if modularized later)
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

// Update options to include CacheManager options
export interface Permit2RpcManagerOptions {
  cacheTtlMs?: number;
  latencyTimeoutMs?: number;
  requestTimeoutMs?: number; // Timeout for the actual RPC call
  nodeCachePath?: string; // Path for Node.js cache file
  localStorageKey?: string; // Key for browser localStorage
  logLevel?: "debug" | "info" | "warn" | "error" | "none"; // Add log level option
}

const DEFAULT_REQUEST_TIMEOUT_MS = 10000; // 10 seconds for RPC calls
const DEFAULT_LOG_LEVEL = "warn"; // Default log level

// Define log level hierarchy (higher number means higher priority)
const LOG_LEVEL_HIERARCHY: Record<NonNullable<Permit2RpcManagerOptions["logLevel"]>, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

export class Permit2RpcManager {
  private dataSource: ChainlistDataSource;
  private cacheManager: CacheManager;
  private latencyTester: LatencyTester;
  private rpcSelector: RpcSelector;
  private requestTimeoutMs: number;
  private logLevel: NonNullable<Permit2RpcManagerOptions["logLevel"]>; // Store the log level
  private configuredLogLevelValue: number; // Store the numeric value for comparison

  constructor(options: Permit2RpcManagerOptions = {}) {
    this.logLevel = options.logLevel ?? DEFAULT_LOG_LEVEL;
    this.configuredLogLevelValue = LOG_LEVEL_HIERARCHY[this.logLevel];
    const logger = this._log.bind(this); // Create bound logger once

    // Instantiate dependencies in correct order, passing logger
    this.dataSource = new ChainlistDataSource(logger);
    this.cacheManager = new CacheManager({
      cacheTtlMs: options.cacheTtlMs,
      nodeCachePath: options.nodeCachePath,
      localStorageKey: options.localStorageKey,
      logger: logger, // Pass logger to CacheManager
    });
    this.latencyTester = new LatencyTester(options.latencyTimeoutMs, logger); // Pass logger to LatencyTester
    this.rpcSelector = new RpcSelector(this.dataSource, this.cacheManager, this.latencyTester, logger); // Pass logger to RpcSelector
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  }

  // Internal logger method
  private _log(level: "debug" | "info" | "warn" | "error", message: string, ...optionalParams: any[]): void {
    if (this.logLevel === "none") {
      return;
    }
    const messageLevelValue = LOG_LEVEL_HIERARCHY[level];
    if (messageLevelValue >= this.configuredLogLevelValue) {
      switch (level) {
        case "debug":
        case "info":
          console.log(`[Permit2RPC:${level}] ${message}`, ...optionalParams);
          break;
        case "warn":
          console.warn(`[Permit2RPC:${level}] ${message}`, ...optionalParams);
          break;
        case "error":
          console.error(`[Permit2RPC:${level}] ${message}`, ...optionalParams);
          break;
      }
    }
  }

  /**
   * Sends a JSON-RPC request to the fastest available RPC for the given chain.
   * Handles fallback by iterating through a ranked list of available RPCs.
   */
  async send<T = any>(chainId: number, method: string, params: any[] = []): Promise<T> {
    const rankedRpcList = await this.rpcSelector.getRankedRpcList(chainId);

    if (rankedRpcList.length === 0) {
      this._log("error", `No available RPC endpoints found for chainId ${chainId}. Cannot send request.`);
      throw new Error(`No available RPC endpoints found for chainId ${chainId}.`);
    }

    let lastError: any = null;

    for (const rpcUrl of rankedRpcList) {
      try {
        this._log("debug", `Attempting RPC call to ${rpcUrl} for chain ${chainId}: ${method}`);
        const result = await this.executeRpcCall<T>(rpcUrl, method, params);
        this._log("debug", `RPC call successful for ${rpcUrl}`);
        return result; // Success! Return the result.
      } catch (error: any) {
        lastError = error; // Store the error in case all attempts fail
        this._log("warn", `RPC call attempt failed for ${rpcUrl} (chain ${chainId}): ${error.message}. Trying next RPC...`);
        // Continue to the next RPC in the list
      }
    }

    // If the loop finishes, all RPCs failed.
    this._log("error", `All available RPC endpoints failed for chainId ${chainId}. Last error: ${lastError?.message}`);
    throw new Error(`All available RPC endpoints failed for chainId ${chainId}. Last error: ${lastError?.message}`);
  }

  /**
   * Executes a single JSON-RPC call to the specified URL.
   */
  private async executeRpcCall<T>(url: string, method: string, params: any[]): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    const requestBody: JsonRpcRequest = {
      jsonrpc: "2.0",
      method,
      params,
      id: `rpc-call-${Date.now()}`,
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
      if (responseData.error) throw new Error(`RPC error ${responseData.error.code}: ${responseData.error.message}`);
      if (responseData.result === undefined) this._log("warn", `RPC response for ${method} had undefined result.`);
      return responseData.result as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") throw new Error(`Request timed out after ${this.requestTimeoutMs}ms`);
      throw error;
    }
  }
}

// --- Example Usage ---

// Standard ERC20 ABI subset
const erc20Abi = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
] as const;

// Token Addresses (DAI where possible, USDC/cUSD otherwise)
const tokenInfo: Record<number, { address: Address; expectedSymbol: string }> = {
  1: { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", expectedSymbol: "DAI" }, // DAI on Ethereum
  10: { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", expectedSymbol: "DAI" }, // DAI on Optimism
  100: { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", expectedSymbol: "DAI" }, // DAI on Gnosis
  137: { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", expectedSymbol: "DAI" }, // DAI on Polygon
  42161: { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", expectedSymbol: "DAI" }, // DAI on Arbitrum
  8453: { address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", expectedSymbol: "DAI" }, // DAI on Base
  56: { address: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", expectedSymbol: "DAI" }, // DAI on BNB Chain
  43114: { address: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70", expectedSymbol: "DAI.e" }, // DAI.e on Avalanche
  42220: { address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", expectedSymbol: "cUSD" }, // Celo Dollar (cUSD) on Celo
  81457: { address: "0x4300000000000000000000000000000000000003", expectedSymbol: "USDB" }, // USDB on Blast (Native Stable)
  324: { address: "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4", expectedSymbol: "USDC" }, // USDC on ZKsync Era
};

// Define COW Token specific info
const cowTokenAddressGnosis: Address = "0xC6ed4f520f6A4e4DC27273509239b7F8A68d2068";
const gnosisChainId = 100;

async function main() {
  console.log("--- Starting Permit2RpcManager Example for Gnosis COW Token ---");
  // Use slightly longer timeouts for real network calls
  // Example: Provide a custom Node.js cache path
  const manager = new Permit2RpcManager({
    latencyTimeoutMs: 7000,
    requestTimeoutMs: 15000,
    // nodeCachePath: '/path/to/your/app/cache/rpc-manager.cache.json' // Example custom path
  });

  try {
    console.log(`\n--- Testing Chain ID: ${gnosisChainId} (Gnosis) ---`);
    // Optional: Fetch block number first to ensure basic connectivity
    // const blockNumber = await manager.send<string>(gnosisChainId, 'eth_blockNumber');
    // console.log(`Gnosis Chain - Latest Block Number: ${parseInt(blockNumber, 16)} (${blockNumber})`);

    console.log(`\n--- Fetching COW Token Symbol on Gnosis ---`);
    const symbol = await readContract<string>({
      manager,
      chainId: gnosisChainId,
      address: cowTokenAddressGnosis,
      abi: erc20Abi, // Using the standard ERC20 ABI subset
      functionName: "symbol",
    });

    console.log(`>>> RESULT: Chain ${gnosisChainId} - Token ${cowTokenAddressGnosis} Symbol: ${symbol}`);
    if (symbol === "COW") {
      console.log(">>> SUCCESS: Correct symbol 'COW' received.");
    } else {
      console.error(`>>> FAILURE: Expected symbol 'COW', but received '${symbol}'`);
    }
  } catch (error) {
    console.error(`Permit2 RPC Manager Example Failed for Chain ${gnosisChainId}:`, error);
  }

  console.log("\n--- Example Finished ---");
}

/* // Comment out example execution for tests
main().catch(err => {
    console.error("Example failed:", err);
    process.exit(1);
});
*/
