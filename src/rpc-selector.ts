import { CacheManager } from './cache-manager.js';
import { ChainlistDataSource } from './chainlist-data-source.js';
import { LatencyTester } from './latency-tester.js'; // Import LatencyTestResult

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
   * Finds the fastest available RPC URL for the given chain ID based on status priority.
   * Priority: 'ok' > 'syncing'. Ignores others.
   * Uses cached data if available and not expired, otherwise performs latency tests.
   * Returns the URL of the fastest valid RPC, or null if none meet the criteria.
   */
  async findFastestRpc(chainId: number): Promise<string | null> {
    // 1. Check cache first for a valid 'ok' RPC
    const cachedFastest = await this.cacheManager.getFastestRpc(chainId);
    if (cachedFastest) {
      // Optional: Could add a quick background check here if needed
      // Check if the cached fastest is still considered 'ok' or 'syncing' in the cached map
      const latencyMap = await this.cacheManager.getLatencyMap(chainId);
      const cachedResult = latencyMap?.[cachedFastest];
      if (cachedResult && (cachedResult.status === 'ok' || cachedResult.status === 'syncing')) {
          console.log(`Using cached fastest RPC for chain ${chainId}: ${cachedFastest} (Status: ${cachedResult.status})`);
          return cachedFastest;
      } else {
          console.log(`Cached fastest RPC ${cachedFastest} for chain ${chainId} is no longer valid or missing in map. Re-evaluating.`);
      }
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

    // 4. Find the fastest valid RPC ('ok' first, then 'syncing')
    let fastestRpc: string | null = null;
    let minLatency = Infinity;
    let foundOk = false;

    // Try to find the fastest RPC in order of preference: ok > wrong_bytecode > syncing
    let foundStatus = null;

    // First try 'ok' status
    for (const url in latencyMap) {
      if (Object.prototype.hasOwnProperty.call(latencyMap, url)) {
        const result = latencyMap[url];
        if (result?.status === 'ok' && result.latency < minLatency) {
          minLatency = result.latency;
          fastestRpc = url;
          foundOk = true;
          foundStatus = 'ok';
        }
      }
    }

    // If no 'ok' RPC found, try 'wrong_bytecode' status as first fallback
    if (!foundOk) {
        console.warn(`No RPCs with 'ok' status found for chain ${chainId}. Checking for 'wrong_bytecode' RPCs...`);
        minLatency = Infinity;
        for (const url in latencyMap) {
            if (Object.prototype.hasOwnProperty.call(latencyMap, url)) {
                const result = latencyMap[url];
                if (result?.status === 'wrong_bytecode' && result.latency < minLatency) {
                    minLatency = result.latency;
                    fastestRpc = url;
                    foundStatus = 'wrong_bytecode';
                }
            }
        }
    }

    // If no 'ok' or 'wrong_bytecode' RPC found, try 'syncing' status as last fallback
    if (!foundStatus) {
        console.warn(`No RPCs with 'ok' or 'wrong_bytecode' status found for chain ${chainId}. Checking for 'syncing' RPCs...`);
        minLatency = Infinity;
        for (const url in latencyMap) {
            if (Object.prototype.hasOwnProperty.call(latencyMap, url)) {
                const result = latencyMap[url];
                if (result?.status === 'syncing' && result.latency < minLatency) {
                    minLatency = result.latency;
                    fastestRpc = url;
                    foundStatus = 'syncing';
                }
            }
        }
    }

    // Log selection result
    if (fastestRpc) {
        console.log(`Selected fastest RPC for chain ${chainId}: ${fastestRpc} (${minLatency}ms, status: ${foundStatus})`);
    }


    if (!fastestRpc) {
      console.warn(`No responsive RPCs found meeting criteria (ok > syncing) for chain ${chainId} after testing.`);
    }

    // 5. Update cache with detailed results and the selected fastest (even if only 'syncing')
    await this.cacheManager.updateChainCache(chainId, latencyMap, fastestRpc);

    return fastestRpc;
  }

   /**
   * Gets the next fastest RPC URL based on the cached latency map, prioritizing 'ok' then 'syncing'.
   * Excludes the currently known fastest RPC (if provided and valid).
   */
  async findNextFastestRpc(chainId: number): Promise<string | null> {
    const latencyMap = await this.cacheManager.getLatencyMap(chainId);
    // Get potentially expired fastest RPC to exclude it correctly
    const currentFastest = (await this.cacheManager['getRawChainCache'](chainId))?.fastestRpc; // Use internal getter

    if (!latencyMap) {
        console.warn(`No latency map found in cache for chain ${chainId} to determine next fastest.`);
        return null;
    }

    let nextFastestRpc: string | null = null;
    let minLatency = Infinity;
    let foundOk = false;

    // Prioritize 'ok' status
    for (const url in latencyMap) {
        if (Object.prototype.hasOwnProperty.call(latencyMap, url)) {
            if (url === currentFastest) continue; // Skip current fastest
            const result = latencyMap[url];
            if (result?.status === 'ok' && result.latency < minLatency) {
                minLatency = result.latency;
                nextFastestRpc = url;
                foundOk = true;
            }
        }
    }

    // If no 'ok' found, try 'syncing'
    if (!foundOk) {
         minLatency = Infinity; // Reset for syncing check
         for (const url in latencyMap) {
            if (Object.prototype.hasOwnProperty.call(latencyMap, url)) {
                if (url === currentFastest) continue;
                const result = latencyMap[url];
                if (result?.status === 'syncing' && result.latency < minLatency) {
                    minLatency = result.latency;
                    nextFastestRpc = url;
                }
            }
        }
         if (nextFastestRpc) {
             console.log(`Next fastest RPC (syncing) found for chain ${chainId}: ${nextFastestRpc} (${minLatency}ms)`);
         }
    } else if (nextFastestRpc) {
         console.log(`Next fastest RPC (ok) found for chain ${chainId}: ${nextFastestRpc} (${minLatency}ms)`);
    }


    if (!nextFastestRpc) {
      console.warn(`No alternative responsive RPCs found meeting criteria for chain ${chainId} in cache.`);
    }

    return nextFastestRpc;
  }
}
