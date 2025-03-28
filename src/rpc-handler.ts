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

// Standard ERC20 ABI subset
const erc20Abi = [
  {
    "constant": true, "inputs": [], "name": "name",
    "outputs": [{ "name": "", "type": "string" }], "payable": false,
    "stateMutability": "view", "type": "function"
  },
  {
    "constant": true, "inputs": [], "name": "symbol",
    "outputs": [{ "name": "", "type": "string" }], "payable": false,
    "stateMutability": "view", "type": "function"
  },
  {
    "constant": true, "inputs": [], "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }], "payable": false,
    "stateMutability": "view", "type": "function"
  },
  {
    "constant": true, "inputs": [], "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }], "payable": false,
    "stateMutability": "view", "type": "function"
  },
] as const;

// Token Addresses (DAI where possible, USDC/cUSD otherwise)
const tokenInfo: Record<number, { address: Address, expectedSymbol: string }> = {
    1:   { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', expectedSymbol: 'DAI' }, // DAI on Ethereum
    10:  { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', expectedSymbol: 'DAI' }, // DAI on Optimism
    100: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', expectedSymbol: 'DAI' }, // DAI on Gnosis
    137: { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', expectedSymbol: 'DAI' }, // DAI on Polygon
    42161: { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', expectedSymbol: 'DAI' }, // DAI on Arbitrum
    8453: { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', expectedSymbol: 'DAI' }, // DAI on Base
    56:  { address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', expectedSymbol: 'DAI' }, // DAI on BNB Chain
    43114: { address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', expectedSymbol: 'DAI.e'}, // DAI.e on Avalanche
    42220: { address: '0x765DE816845861e75A25fCA122bb6898B8B1282a', expectedSymbol: 'cUSD' }, // Celo Dollar (cUSD) on Celo
    81457: { address: '0x4300000000000000000000000000000000000003', expectedSymbol: 'USDB' }, // USDB on Blast (Native Stable)
    324: { address: '0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4', expectedSymbol: 'USDC' }, // USDC on ZKsync Era
    // Note: Gnosis DAI address is same as Ethereum's
    100: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', expectedSymbol: 'DAI' },
    // ... add others if needed for broader testing later
};

// Define COW Token specific info
const cowTokenAddressGnosis: Address = '0xC6ed4f520f6A4e4DC27273509239b7F8A68d2068';
const gnosisChainId = 100;

async function main() {
    console.log("--- Starting RpcHandler Example for Gnosis COW Token ---");
    // Use slightly longer timeouts for real network calls
    const handler = new RpcHandler({ latencyTimeoutMs: 7000, requestTimeoutMs: 15000 });

    try {
        console.log(`\n--- Testing Chain ID: ${gnosisChainId} (Gnosis) ---`);
        // Optional: Fetch block number first to ensure basic connectivity
        // const blockNumber = await handler.send<string>(gnosisChainId, 'eth_blockNumber');
        // console.log(`Gnosis Chain - Latest Block Number: ${parseInt(blockNumber, 16)} (${blockNumber})`);

        console.log(`\n--- Fetching COW Token Symbol on Gnosis ---`);
        const symbol = await readContract<string>({
            handler,
            chainId: gnosisChainId,
            address: cowTokenAddressGnosis,
            abi: erc20Abi, // Using the standard ERC20 ABI subset
            functionName: 'symbol',
        });

        console.log(`>>> RESULT: Chain ${gnosisChainId} - Token ${cowTokenAddressGnosis} Symbol: ${symbol}`);
        if (symbol === 'COW') {
            console.log(">>> SUCCESS: Correct symbol 'COW' received.");
        } else {
            console.error(`>>> FAILURE: Expected symbol 'COW', but received '${symbol}'`);
        }

    } catch (error) {
        console.error(`RPC Handler Example Failed for Chain ${gnosisChainId}:`, error);
    }

    console.log("\n--- Example Finished ---");
}

/* // Comment out example execution for tests
main().catch(err => {
    console.error("Example failed:", err);
    process.exit(1);
});
*/
