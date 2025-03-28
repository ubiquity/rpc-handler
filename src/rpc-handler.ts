import { CacheManager } from './cache-manager.js';
import { ChainlistDataSource } from './chainlist-data-source.js';
import { LatencyTester } from './latency-tester.js';
import { RpcSelector } from './rpc-selector.js';

// Re-define JSON-RPC request/response interfaces (or import if modularized later)
interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any[];
  id: number | string;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

interface RpcHandlerOptions {
  cacheTtlMs?: number;
  latencyTimeoutMs?: number;
  requestTimeoutMs?: number; // Timeout for the actual RPC call
}

const DEFAULT_REQUEST_TIMEOUT_MS = 10000; // 10 seconds for RPC calls

export class RpcHandler {
  private dataSource: ChainlistDataSource;
  private cacheManager: CacheManager;
  private latencyTester: LatencyTester;
  private rpcSelector: RpcSelector;
  private requestTimeoutMs: number;

  constructor(options: RpcHandlerOptions = {}) {
    this.dataSource = new ChainlistDataSource();
    this.cacheManager = new CacheManager(options.cacheTtlMs);
    this.latencyTester = new LatencyTester(options.latencyTimeoutMs);
    this.rpcSelector = new RpcSelector(
      this.dataSource,
      this.cacheManager,
      this.latencyTester,
    );
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  }

  /**
   * Sends a JSON-RPC request to the fastest available RPC for the given chain.
   * Handles fallback to the next fastest RPC if the primary one fails.
   */
  async send<T = any>(chainId: number, method: string, params: any[] = []): Promise<T> {
    let rpcUrl = await this.rpcSelector.findFastestRpc(chainId);

    if (!rpcUrl) {
      throw new Error(`No available RPC endpoints found for chainId ${chainId}.`);
    }

    try {
      console.log(`Attempting RPC call to ${rpcUrl} for chain ${chainId}: ${method}`);
      return await this.executeRpcCall<T>(rpcUrl, method, params);
    } catch (error: any) {
      console.warn(`RPC call failed for ${rpcUrl} (chain ${chainId}): ${error.message}. Attempting fallback...`);

      // Attempt fallback to the next fastest RPC
      const fallbackRpcUrl = await this.rpcSelector.findNextFastestRpc(chainId);

      if (!fallbackRpcUrl) {
        console.error(`Fallback failed: No alternative RPC endpoint found for chainId ${chainId}.`);
        throw new Error(`RPC call failed for chainId ${chainId} and no fallback available. Original error: ${error.message}`);
      }

      try {
        console.log(`Attempting fallback RPC call to ${fallbackRpcUrl} for chain ${chainId}: ${method}`);
        // If fallback succeeds, consider updating cache? Maybe not, let next latency test sort it out.
        return await this.executeRpcCall<T>(fallbackRpcUrl, method, params);
      } catch (fallbackError: any) {
        console.error(`Fallback RPC call failed for ${fallbackRpcUrl} (chain ${chainId}): ${fallbackError.message}`);
        throw new Error(`RPC call failed for chainId ${chainId} on primary and fallback endpoints. Fallback error: ${fallbackError.message}`);
      }
    }
  }

  /**
   * Executes a single JSON-RPC call to the specified URL.
   */
  private async executeRpcCall<T>(url: string, method: string, params: any[]): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    const requestBody: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: `rpc-call-${Date.now()}`, // Simple unique ID
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status} ${response.statusText}`);
      }

      const responseData: JsonRpcResponse = await response.json();

      if (responseData.error) {
        throw new Error(`RPC error ${responseData.error.code}: ${responseData.error.message}`);
      }

      if (responseData.result === undefined) {
         // Handle cases where result might be legitimately null/undefined vs error
         // This check might need refinement based on specific RPC method expectations
         console.warn(`RPC response for ${method} had undefined result.`);
         // Depending on strictness, could throw or return as is. Returning for now.
      }

      return responseData.result as T;

    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${this.requestTimeoutMs}ms`);
      }
      // Re-throw other errors (HTTP, RPC, network)
      throw error;
    }
  }
}

// Example Usage (Optional)

async function main() {
    console.log("--- Starting RpcHandler Example ---");
    // Use slightly longer timeouts for real network calls
    const handler = new RpcHandler({ latencyTimeoutMs: 5000, requestTimeoutMs: 10000 });
    const chainIdsToTest = [1, 10, 100]; // Ethereum, Optimism, Gnosis

    for (const chainId of chainIdsToTest) {
        try {
            console.log(`\n--- Testing Chain ID: ${chainId} ---`);
            const blockNumber = await handler.send<string>(chainId, 'eth_blockNumber');
            console.log(`Chain ${chainId} - Latest Block Number: ${parseInt(blockNumber, 16)} (${blockNumber})`);

            // Optional: Add a small delay between chains if needed
            // await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.error(`RPC Handler Example Failed for Chain ${chainId}:`, error);
            // Continue to the next chain even if one fails
        }
    }
    console.log("\n--- Example Finished ---");
    // Removed stray catch block from previous version
}

/* // Comment out example execution for tests
main().catch(err => {
    console.error("Example failed:", err);
    process.exit(1);
});
*/
