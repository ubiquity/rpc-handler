import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Define the structure for cached data per chain
interface ChainCache {
  fastestRpc: string | null;
  latencyMap: Record<string, number>; // Map of RPC URL -> latency in ms
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
          // File doesn't exist, which is fine on first run
          this.cache = {};
        } else {
          console.error('Failed to load cache from file:', error);
          this.cache = {}; // Reset cache on error
        }
      }
    }
    this.cacheLoaded = true;
  }

  private async saveCache(): Promise<void> {
    if (!this.cacheLoaded) return; // Don't save if not loaded

    if (isBrowser) {
      try {
        window.localStorage.setItem(this.cacheKey, JSON.stringify(this.cache));
      } catch (error) {
        console.error('Failed to save cache to localStorage:', error);
      }
    } else if (isNode && nodeCachePath) {
      try {
        await fs.writeFile(nodeCachePath, JSON.stringify(this.cache, null, 2));
      } catch (error) {
        console.error('Failed to save cache to file:', error);
      }
    }
  }

  async getChainCache(chainId: number): Promise<ChainCache | null> {
    await this.loadCache();
    const chainCache = this.cache[chainId];

    if (chainCache && Date.now() - chainCache.lastTested < this.cacheTtlMs) {
      return chainCache;
    }
    // Cache is expired or doesn't exist
    return null;
  }

  async updateChainCache(chainId: number, latencyMap: Record<string, number>, fastestRpc: string | null): Promise<void> {
    await this.loadCache();
    this.cache[chainId] = {
      fastestRpc,
      latencyMap,
      lastTested: Date.now(),
    };
    await this.saveCache();
  }

  async getFastestRpc(chainId: number): Promise<string | null> {
    const chainCache = await this.getChainCache(chainId);
    return chainCache?.fastestRpc ?? null;
  }

  async getLatencyMap(chainId: number): Promise<Record<string, number> | null> {
     const chainCache = await this.getChainCache(chainId);
     return chainCache?.latencyMap ?? null;
  }
}
