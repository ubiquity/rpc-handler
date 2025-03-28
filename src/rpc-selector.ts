import { ChainlistDataSource } from './chainlist-data-source.js'; // Use .js extension for ES modules
import { CacheManager } from './cache-manager.js';
import { LatencyTester } from './latency-tester.js';

export class RpcSelector {
  private dataSource: ChainlistDataSource;
  private cacheManager: CacheManager;
  private latencyTester: LatencyTester;

  constructor(
    dataSource: ChainlistDataSource,
    cacheManager: CacheManager,
    latencyTester: LatencyTester,
  ) {
    this.dataSource = dataSource;
    this.cacheManager = cacheManager;
    this.latencyTester = latencyTester;
  }

  /**
   * Finds the fastest available RPC URL for the given chain ID.
   * Uses cached data if available and not expired, otherwise performs latency tests.
   * Returns the URL of the fastest RPC, or null if none are available or working.
   */
  async findFastestRpc(chainId: number): Promise<string | null> {
    // 1. Check cache first
    const cachedFastest = await this.cacheManager.getFastestRpc(chainId);
    if (cachedFastest) {
      console.log(`Using cached fastest RPC for chain ${chainId}: ${cachedFastest}`);
      // Optional: Could add a quick background check here to verify if cached RPC is still responsive
      return cachedFastest;
    }

    console.log(`No valid cache for chain ${chainId}. Performing latency tests...`);

    // 2. Get RPC URLs from data source
    const rpcUrls = await this.dataSource.getRpcUrls(chainId);
    if (rpcUrls.length === 0) {
      console.warn(`No RPC URLs found for chain ${chainId} in data source.`);
      return null; // No URLs to test
    }

    // 3. Test latency
    const latencyMap = await this.latencyTester.testRpcUrls(rpcUrls);

    // 4. Find the fastest valid RPC from the results
    let fastestRpc: string | null = null;
    let minLatency = Infinity;

    for (const url in latencyMap) {
      // Check if the key actually exists on the object
      if (Object.prototype.hasOwnProperty.call(latencyMap, url)) {
        const latency = latencyMap[url];
        // Ensure latency is a valid number and less than current min
        if (typeof latency === 'number' && latency < minLatency) {
          minLatency = latency;
          fastestRpc = url;
        }
      }
    }

    if (fastestRpc) {
      console.log(`Fastest RPC found for chain ${chainId}: ${fastestRpc} (${minLatency}ms)`);
    } else {
      console.warn(`No responsive RPCs found for chain ${chainId} after testing.`);
    }

    // 5. Update cache
    await this.cacheManager.updateChainCache(chainId, latencyMap, fastestRpc);

    return fastestRpc;
  }

   /**
   * Gets the next fastest RPC URL based on the cached latency map.
   * Useful for fallback logic when the primary fastest RPC fails.
   * Excludes the currently known fastest RPC.
   */
  async findNextFastestRpc(chainId: number): Promise<string | null> {
    const latencyMap = await this.cacheManager.getLatencyMap(chainId);
    const currentFastest = await this.cacheManager.getFastestRpc(chainId);

    if (!latencyMap) {
        console.warn(`No latency map found in cache for chain ${chainId} to determine next fastest.`);
        return null; // Cannot determine next fastest without latency data
    }

    let nextFastestRpc: string | null = null;
    let minLatency = Infinity;

    for (const url in latencyMap) {
        if (Object.prototype.hasOwnProperty.call(latencyMap, url)) {
            // Skip the current fastest RPC
            if (url === currentFastest) {
                continue;
            }

            const latency = latencyMap[url];
            if (typeof latency === 'number' && latency < minLatency) {
                minLatency = latency;
                nextFastestRpc = url;
            }
        }
    }

     if (nextFastestRpc) {
      console.log(`Next fastest RPC found for chain ${chainId}: ${nextFastestRpc} (${minLatency}ms)`);
    } else {
      console.warn(`No alternative responsive RPCs found for chain ${chainId} in cache.`);
    }

    return nextFastestRpc;
  }
}
