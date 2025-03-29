import { CacheManager } from "./cache-manager.ts";
import { ChainlistDataSource } from "./chainlist-data-source.ts";
import { LatencyTester, LatencyTestResult } from "./latency-tester.ts";

// Define a logger type
type LoggerFn = (level: "debug" | "info" | "warn" | "error", message: string, ...optionalParams: any[]) => void;

// Define acceptable statuses for selection
const ACCEPTABLE_STATUSES: LatencyTestResult["status"][] = ["ok", "wrong_bytecode", "syncing"];

// Map to track ongoing latency tests for specific chains
const ongoingLatencyTests = new Map<number, Promise<Record<string, LatencyTestResult>>>();

export class RpcSelector {
  private dataSource: ChainlistDataSource;
  private cacheManager: CacheManager;
  private latencyTester: LatencyTester;
  private log: LoggerFn;

  constructor(dataSource: ChainlistDataSource, cacheManager: CacheManager, latencyTester: LatencyTester, logger?: LoggerFn) {
    this.dataSource = dataSource;
    this.cacheManager = cacheManager;
    this.latencyTester = latencyTester;
    this.log = logger || (() => {});
  }

  /**
   * Gets a ranked list of available RPC URLs for the given chain ID.
   * Fetches from cache or performs latency tests if needed.
   * Filters out RPCs with error statuses.
   * Sorts the remaining RPCs by status priority (ok > wrong_bytecode > syncing) and then by latency.
   * Ensures only one latency test runs concurrently per chain ID.
   *
   * @param chainId - The chain ID.
   * @returns A promise that resolves to a sorted array of usable RPC URLs.
   */
  async getRankedRpcList(chainId: number): Promise<string[]> {
    let latencyMap = await this.cacheManager.getLatencyMap(chainId);
    let fastestCachedRpc = await this.cacheManager.getFastestRpc(chainId); // Check if cache is valid

    // If cache is invalid (no map or fastest RPC doesn't match map status), re-test
    if (!latencyMap || !fastestCachedRpc || !latencyMap[fastestCachedRpc] || !ACCEPTABLE_STATUSES.includes(latencyMap[fastestCachedRpc].status)) {
      if (fastestCachedRpc && latencyMap) {
         this.log("info", `Cached fastest RPC ${fastestCachedRpc} for chain ${chainId} is no longer valid or missing in map. Re-testing.`);
      } else {
         this.log("info", `No valid cache for chain ${chainId}. Performing latency tests...`);
      }

      // --- Latency Test Locking ---
      let testPromise = ongoingLatencyTests.get(chainId);
      if (testPromise) {
        this.log("debug", `Latency test already in progress for chain ${chainId}, awaiting result...`);
        latencyMap = await testPromise; // Wait for the ongoing test
      } else {
        const rpcUrls = this.dataSource.getRpcUrls(chainId);
        if (rpcUrls.length === 0) {
          this.log("warn", `No RPC URLs found for chain ${chainId} in data source.`);
          return []; // No URLs to test
        }

        // Create the promise, store it, run the test, then remove it
        testPromise = this.latencyTester.testRpcUrls(rpcUrls);
        ongoingLatencyTests.set(chainId, testPromise);
        this.log("debug", `Initiated latency test for chain ${chainId}.`);

        try {
            latencyMap = await testPromise;
            // Find the new fastest based on the fresh test results
            const newFastest = this._findFastestInMap(latencyMap);
            await this.cacheManager.updateChainCache(chainId, latencyMap, newFastest?.url ?? null);
            if (newFastest) {
               this.log("info", `Selected fastest RPC for chain ${chainId}: ${newFastest.url} (${newFastest.latency}ms, status: ${newFastest.status})`);
            } else {
               this.log("warn", `No responsive RPCs found meeting criteria (${ACCEPTABLE_STATUSES.join(" > ")}) for chain ${chainId} after testing.`);
            }
        } catch (error) {
             this.log("error", `Latency test failed for chain ${chainId}`, error);
             latencyMap = {}; // Set empty map on error
        } finally {
            ongoingLatencyTests.delete(chainId); // Remove promise once done
            this.log("debug", `Latency test finished for chain ${chainId}.`);
        }
      }
      // --- End Latency Test Locking ---

    } else {
       this.log("debug", `Using valid cached latency map for chain ${chainId}.`);
    }

    // Filter and sort the results from the (potentially updated) latency map
    const rankedList = this._rankResults(latencyMap);
    this.log("debug", `Ranked RPC list for chain ${chainId}:`, rankedList);
    return rankedList;
  }

  /**
   * Helper to find the single best RPC from a latency map based on status and latency.
   */
  private _findFastestInMap(latencyMap: Record<string, LatencyTestResult> | null): LatencyTestResult | null {
    if (!latencyMap) return null;

    let bestResult: LatencyTestResult | null = null;

    for (const status of ACCEPTABLE_STATUSES) {
      let fastestForStatus: LatencyTestResult | null = null;
      for (const url in latencyMap) {
        const result = latencyMap[url];
        if (result?.status === status) {
          if (!fastestForStatus || result.latency < fastestForStatus.latency) {
            fastestForStatus = result;
          }
        }
      }
      if (fastestForStatus) {
        bestResult = fastestForStatus;
        break; // Found the best according to status priority
      }
    }
    return bestResult;
  }

  /**
   * Helper to filter and rank RPC results based on status and latency.
   */
  private _rankResults(latencyMap: Record<string, LatencyTestResult> | null): string[] {
    if (!latencyMap) return [];

    const validResults = Object.values(latencyMap).filter(
      (result) => result && ACCEPTABLE_STATUSES.includes(result.status)
    );

    // Sort by status priority, then latency
    validResults.sort((a, b) => {
      const statusA = ACCEPTABLE_STATUSES.indexOf(a.status);
      const statusB = ACCEPTABLE_STATUSES.indexOf(b.status);
      if (statusA !== statusB) {
        return statusA - statusB; // Lower index (better status) comes first
      }
      return a.latency - b.latency; // Lower latency comes first
    });

    return validResults.map((result) => result.url);
  }

  // --- Deprecated Methods (to be removed or kept for internal use if needed) ---
  // async findFastestRpc(chainId: number): Promise<string | null> { ... }
  // async findNextFastestRpc(chainId: number): Promise<string | null> { ... }
}
