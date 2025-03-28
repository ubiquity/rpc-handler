import type { Address } from 'viem'; // Import viem types for example
import { CacheManager } from './cache-manager.js';
import { ChainlistDataSource } from './chainlist-data-source.js';
import { readContract } from './contract-utils.js'; // Import the helper
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

export interface RpcHandlerOptions { // Added export
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
      jsonrpc: '2.0', method, params, id: `rpc-call-${Date.now()}`,
    };

    try {
      const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody), signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP error ${response.status} ${response.statusText}`);
      const responseData: JsonRpcResponse = await response.json();
      if (responseData.error) throw new Error(`RPC error ${responseData.error.code}: ${responseData.error.message}`);
      if (responseData.result === undefined) console.warn(`RPC response for ${method} had undefined result.`);
      return responseData.result as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') throw new Error(`Request timed out after ${this.requestTimeoutMs}ms`);
      throw error;
    }
  }
}

// --- Example Usage ---

// Minimal ERC20 ABI for balanceOf
const erc20Abi = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    stateMutability: 'view', // Added missing field
    type: 'function',
  },
] as const; // Use 'as const' for better type inference with viem

// Example address (replace with a real address holding USDC)
const exampleAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC contract address itself (for demo)
const addressToCheck = '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503'; // An address holding some USDC

async function main() {
    console.log("--- Starting RpcHandler Example ---");
    const handler = new RpcHandler({ latencyTimeoutMs: 5000, requestTimeoutMs: 10000 });
    const chainIdsToTest = [1, 10, 100]; // Ethereum, Optimism, Gnosis

    for (const chainId of chainIdsToTest) {
        try {
            console.log(`\n--- Testing Chain ID: ${chainId} ---`);
            const blockNumber = await handler.send<string>(chainId, 'eth_blockNumber');
            console.log(`Chain ${chainId} - Latest Block Number: ${parseInt(blockNumber, 16)} (${blockNumber})`);

            // Only try ERC20 example on Ethereum (chain 1) for simplicity
            if (chainId === 1) {
                console.log(`\n--- Testing readContract on Chain ID: ${chainId} ---`);
                const balance = await readContract<bigint>({
                    handler,
                    chainId,
                    address: exampleAddress as Address, // USDC Contract
                    abi: erc20Abi,
                    functionName: 'balanceOf',
                    args: [addressToCheck as Address],
                });
                console.log(`Chain ${chainId} - USDC Balance of ${addressToCheck}: ${balance.toString()}`);
            }

        } catch (error) {
            console.error(`RPC Handler Example Failed for Chain ${chainId}:`, error);
        }
    }
    console.log("\n--- Example Finished ---");
}

/* // Comment out example execution for tests
main().catch(err => {
    console.error("Example failed:", err);
    process.exit(1);
});
*/
