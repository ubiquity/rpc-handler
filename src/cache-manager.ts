// Node imports removed
import type { LatencyTestResult } from "./latency-tester.ts";

// Define a logger type
type LoggerFn = (level: "debug" | "info" | "warn" | "error", message: string, ...optionalParams: any[]) => void;

// Define the structure for cached data per chain
interface ChainCache {
  fastestRpc: string | null;
  latencyMap: Record<string, LatencyTestResult>;
  lastTested: number;
}

// Define the overall cache structure
type CacheData = Record<number, ChainCache>;

// --- Environment Check (Runtime for Browser) ---
// We assume if this module is loaded, it's likely in a browser context
// or a Node context where file caching isn't the default.
const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_LOCAL_STORAGE_KEY = "permit2RpcManagerCache";

// Options for CacheManager constructor
interface CacheManagerOptions {
  cacheTtlMs?: number;
  // nodeCachePath is no longer used in this base class
  localStorageKey?: string;
  logger?: LoggerFn;
}

/**
 * CacheManager primarily for browser environments using localStorage.
 * Node.js file caching is handled separately in cache-manager.node.ts.
 */
export class CacheManager {
  private cache: CacheData = {};
  private cacheLoaded = false;
  private cacheKey: string;
  // nodeCachePath removed
  private cacheTtlMs: number;
  private log: LoggerFn;

  constructor(options: CacheManagerOptions = {}) {
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.cacheKey = options.localStorageKey ?? DEFAULT_LOCAL_STORAGE_KEY;
    this.log = options.logger || (() => {});
    // No Node path determination needed here
  }

  private async loadCache(): Promise<void> {
    if (this.cacheLoaded) return;

    // Only implement browser logic here
    if (isBrowser) {
      try {
        const storedCache = window.localStorage.getItem(this.cacheKey);
        if (storedCache) {
          this.cache = JSON.parse(storedCache);
          this.log("debug", `CacheManager (Browser): Loaded cache from localStorage (key: ${this.cacheKey})`);
        } else {
          this.log("debug", `CacheManager (Browser): No cache found in localStorage (key: ${this.cacheKey})`);
        }
      } catch (error) {
        this.log("error", `CacheManager (Browser): Failed to load cache from localStorage (key: ${this.cacheKey}):`, error);
        this.cache = {};
      }
    } else {
      // In non-browser environments, this default manager won't load from files
      this.log("warn", "CacheManager: Not in a browser environment, skipping localStorage cache load. File caching requires explicit use of NodeCacheHandler.");
      this.cache = {};
    }
    this.cacheLoaded = true;
  }

  private async saveCache(): Promise<void> {
    if (!this.cacheLoaded) {
      this.log("warn", "CacheManager: Attempted to save cache before loading.");
      return;
    }

    // Only implement browser logic here
    if (isBrowser) {
      try {
        window.localStorage.setItem(this.cacheKey, JSON.stringify(this.cache));
        this.log("debug", `CacheManager (Browser): Saved cache to localStorage (key: ${this.cacheKey})`);
      } catch (error) {
        this.log("error", `CacheManager (Browser): Failed to save cache to localStorage (key: ${this.cacheKey}):`, error);
      }
    } else {
       // In non-browser environments, this default manager won't save to files
       this.log("warn", "CacheManager: Not in a browser environment, skipping localStorage cache save.");
    }
  }

  // Internal helper remains largely the same, relies on loadCache
  private async getRawChainCache(chainId: number): Promise<ChainCache | null> {
    await this.loadCache();
    return this.cache[chainId] ?? null;
  }

  // Public methods remain the same
  async getChainCache(chainId: number): Promise<ChainCache | null> {
    const chainCache = await this.getRawChainCache(chainId);
    if (chainCache && Date.now() - chainCache.lastTested < this.cacheTtlMs) {
      return chainCache;
    }
    this.log("debug", `CacheManager: Cache miss or expired for chainId ${chainId}`);
    return null;
  }

  async updateChainCache(chainId: number, latencyMap: Record<string, LatencyTestResult>, fastestRpc: string | null): Promise<void> {
    await this.loadCache(); // Ensure loaded before update
    this.log("debug", `CacheManager: Updating cache for chainId ${chainId}`, { fastestRpc, latencyMapCount: Object.keys(latencyMap || {}).length });
    this.cache[chainId] = {
      fastestRpc,
      latencyMap: latencyMap || {},
      lastTested: Date.now(),
    };
    await this.saveCache();
  }

  async getFastestRpc(chainId: number): Promise<string | null> {
    const chainCache = await this.getChainCache(chainId);
    return chainCache?.fastestRpc ?? null;
  }

  async getLatencyMap(chainId: number): Promise<Record<string, LatencyTestResult> | null> {
    const chainCache = await this.getRawChainCache(chainId);
    return chainCache?.latencyMap ?? null;
  }
}
