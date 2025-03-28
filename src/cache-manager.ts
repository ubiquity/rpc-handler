import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
// Import the detailed result type using 'import type' for type-only imports
import type { LatencyTestResult } from './latency-tester.js';

// Define the structure for cached data per chain
interface ChainCache {
  fastestRpc: string | null;
  latencyMap: Record<string, LatencyTestResult>; // Store detailed results
  lastTested: number; // Timestamp of the last test run for this chain
}

// Define the overall cache structure (map of chainId -> ChainCache)
type CacheData = Record<number, ChainCache>;

// --- Environment Detection ---
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

// --- Node.js Cache File Path ---
let nodeCachePath: string | null = null;
if (isNode) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // Default cache file in the project root
  nodeCachePath = path.join(__dirname, '..', '.rpc-cache.json');
}

const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export class CacheManager {
  private cache: CacheData = {};
  private cacheLoaded = false;
  private cacheKey = 'rpcHandlerCache'; // Key for localStorage

  constructor(private cacheTtlMs: number = DEFAULT_CACHE_TTL_MS) {}

  private async loadCache(): Promise<void> {
    if (this.cacheLoaded) return;

    if (isBrowser) {
      try {
        const storedCache = window.localStorage.getItem(this.cacheKey);
        if (storedCache) {
          this.cache = JSON.parse(storedCache);
        }
      } catch (error) {
        console.error('Failed to load cache from localStorage:', error);
        this.cache = {}; // Reset cache on error
      }
    } else if (isNode && nodeCachePath) {
      try {
        const rawData = await fs.readFile(nodeCachePath, 'utf-8');
        this.cache = JSON.parse(rawData);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          this.cache = {};
        } else {
          console.error('Failed to load cache from file:', error);
          this.cache = {};
        }
      }
    }
    this.cacheLoaded = true;
  }

  private async saveCache(): Promise<void> {
    if (!this.cacheLoaded) return;

    if (isBrowser) {
      try {
        window.localStorage.setItem(this.cacheKey, JSON.stringify(this.cache));
      } catch (error) {
        console.error('Failed to save cache to localStorage:', error);
      }
    } else if (isNode && nodeCachePath) {
      try {
        // Save detailed latency map
        await fs.writeFile(nodeCachePath, JSON.stringify(this.cache, null, 2));
      } catch (error) {
        console.error('Failed to save cache to file:', error);
      }
    }
  }

  // Internal helper to get potentially expired cache
  private async getRawChainCache(chainId: number): Promise<ChainCache | null> {
      await this.loadCache();
      return this.cache[chainId] ?? null;
  }

  // Public method to get valid (non-expired) cache
  async getChainCache(chainId: number): Promise<ChainCache | null> {
    const chainCache = await this.getRawChainCache(chainId);
    if (chainCache && Date.now() - chainCache.lastTested < this.cacheTtlMs) {
      return chainCache;
    }
    return null;
  }

  // Update method signature to accept the detailed map
  async updateChainCache(chainId: number, latencyMap: Record<string, LatencyTestResult>, fastestRpc: string | null): Promise<void> {
    await this.loadCache();
    this.cache[chainId] = {
      fastestRpc,
      latencyMap: latencyMap || {}, // Ensure we save an object even if null/undefined passed
      lastTested: Date.now(),
    };
    await this.saveCache();
  }

  async getFastestRpc(chainId: number): Promise<string | null> {
    const chainCache = await this.getChainCache(chainId); // Uses TTL check
    return chainCache?.fastestRpc ?? null;
  }

  // Update return type
  async getLatencyMap(chainId: number): Promise<Record<string, LatencyTestResult> | null> {
     // Return the map even if expired, RpcSelector might want old data if tests fail
     const chainCache = await this.getRawChainCache(chainId);
     return chainCache?.latencyMap ?? null;
  }
}
