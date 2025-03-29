// Use static imports again
import nodeFs from "node:fs/promises";
import nodeOs from "node:os";
import nodePath from "node:path";
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

// --- Environment Detection (Using process.env injected by build) ---
// declare const IS_NODE: boolean; // Removed
// declare const IS_BROWSER: boolean; // Removed
// We will check process.env.BUILD_ENV which will be defined by bun build --define

const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_NODE_CACHE_FILENAME = "permit2-rpc-manager.cache.json";
const DEFAULT_LOCAL_STORAGE_KEY = "permit2RpcManagerCache";

// Options for CacheManager constructor
interface CacheManagerOptions {
  cacheTtlMs?: number;
  nodeCachePath?: string; // User-provided path takes precedence
  localStorageKey?: string;
  logger?: LoggerFn;
}

export class CacheManager {
  private cache: CacheData = {};
  private cacheLoaded = false;
  private cacheKey: string;
  private nodeCachePath: string | null = null;
  private cacheTtlMs: number;
  private log: LoggerFn;

  constructor(options: CacheManagerOptions = {}) {
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.cacheKey = options.localStorageKey ?? DEFAULT_LOCAL_STORAGE_KEY;
    this.log = options.logger || (() => {});

    // Determine Node.js cache path using build defines
    // This block should be removed entirely by tree-shaking in browser builds
    if (process.env.BUILD_ENV === 'node') {
      if (options.nodeCachePath) {
        this.nodeCachePath = options.nodeCachePath;
        this.log("info", `CacheManager (Node.js): Using user-provided cache path: ${this.nodeCachePath}`);
      } else {
        try {
          this.nodeCachePath = nodePath.join(nodeOs.tmpdir(), DEFAULT_NODE_CACHE_FILENAME);
          this.log("info", `CacheManager (Node.js): Determined default cache path: ${this.nodeCachePath}`);
        } catch (e) {
          this.log("error", "Error determining default Node.js cache path in temp dir:", e);
          this.nodeCachePath = null;
        }
      }
       if (!this.nodeCachePath) {
         this.log("warn", "CacheManager (Node.js): Could not determine cache path. Caching will be disabled.");
       }
    }
  }

  private async loadCache(): Promise<void> {
    if (this.cacheLoaded) return;

    // Use process.env check for browser logic
    if (process.env.BUILD_ENV === 'browser') {
      try {
        // Check window existence again just in case (though BUILD_ENV should guarantee it)
        if (typeof window !== "undefined" && window.localStorage) {
            const storedCache = window.localStorage.getItem(this.cacheKey);
            if (storedCache) {
              this.cache = JSON.parse(storedCache);
              this.log("debug", `CacheManager (Browser): Loaded cache from localStorage (key: ${this.cacheKey})`);
            } else {
              this.log("debug", `CacheManager (Browser): No cache found in localStorage (key: ${this.cacheKey})`);
            }
        } else {
             this.log("warn", "CacheManager (Browser): localStorage not available.");
             this.cache = {};
        }
      } catch (error) {
        this.log("error", `CacheManager (Browser): Failed to load cache from localStorage (key: ${this.cacheKey}):`, error);
        this.cache = {};
      }
    }
    // Use process.env check for Node logic
    else if (process.env.BUILD_ENV === 'node') {
      if (this.nodeCachePath) {
        try {
          const rawData = await nodeFs.readFile(this.nodeCachePath, "utf-8");
          this.cache = JSON.parse(rawData);
          this.log("debug", `CacheManager (Node.js): Loaded cache from file (${this.nodeCachePath})`);
        } catch (error: any) {
          if (error.code === "ENOENT") {
            this.log("debug", `CacheManager (Node.js): Cache file not found (${this.nodeCachePath}), initializing empty cache.`);
            this.cache = {};
          } else {
            this.log("error", `CacheManager (Node.js): Failed to load cache from file (${this.nodeCachePath}):`, error);
            this.cache = {};
          }
        }
      } else {
          this.log("warn", "CacheManager (Node.js): Skipping file cache load (no path determined).");
      }
    }
    this.cacheLoaded = true;
  }

  private async saveCache(): Promise<void> {
    if (!this.cacheLoaded) {
      this.log("warn", "CacheManager: Attempted to save cache before loading.");
      return;
    }

    // Use process.env check for browser logic
    if (process.env.BUILD_ENV === 'browser') {
      try {
         if (typeof window !== "undefined" && window.localStorage) {
            window.localStorage.setItem(this.cacheKey, JSON.stringify(this.cache));
            this.log("debug", `CacheManager (Browser): Saved cache to localStorage (key: ${this.cacheKey})`);
         } else {
             this.log("warn", "CacheManager (Browser): localStorage not available, skipping save.");
         }
      } catch (error) {
        this.log("error", `CacheManager (Browser): Failed to save cache to localStorage (key: ${this.cacheKey}):`, error);
      }
    }
    // Use process.env check for Node logic
    else if (process.env.BUILD_ENV === 'node') {
       if (this.nodeCachePath) {
        try {
          const dir = nodePath.dirname(this.nodeCachePath);
          await nodeFs.mkdir(dir, { recursive: true });
          await nodeFs.writeFile(this.nodeCachePath, JSON.stringify(this.cache, null, 2));
          this.log("debug", `CacheManager (Node.js): Saved cache to file (${this.nodeCachePath})`);
        } catch (error) {
          this.log("error", `CacheManager (Node.js): Failed to save cache to file (${this.nodeCachePath}):`, error);
        }
      } else {
          this.log("warn", "CacheManager (Node.js): Skipping file cache save (no path determined).");
      }
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
