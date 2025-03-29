import * as fs from "node:fs/promises"; // Add node: prefix
import * as os from "node:os"; // Add node: prefix
import * as path from "node:path"; // Add node: prefix
// Import the detailed result type using 'import type' for type-only imports
import type { LatencyTestResult } from "./latency-tester.js"; // Keep .js extension for module compatibility

// Define a logger type (can be shared or defined per file)
type LoggerFn = (level: "debug" | "info" | "warn" | "error", message: string, ...optionalParams: any[]) => void;

// Define the structure for cached data per chain
interface ChainCache {
  fastestRpc: string | null;
  latencyMap: Record<string, LatencyTestResult>; // Store detailed results
  lastTested: number; // Timestamp of the last test run for this chain
}

// Define the overall cache structure (map of chainId -> ChainCache)
type CacheData = Record<number, ChainCache>;

// --- Environment Detection ---
const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";
const isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;

const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_NODE_CACHE_FILENAME = "permit2-rpc-manager.cache.json";
const DEFAULT_LOCAL_STORAGE_KEY = "permit2RpcManagerCache";

// Options for CacheManager constructor
interface CacheManagerOptions {
  cacheTtlMs?: number;
  nodeCachePath?: string; // Allow overriding the Node.js cache file path
  localStorageKey?: string;
  logger?: LoggerFn; // Add logger option
}

export class CacheManager {
  private cache: CacheData = {};
  private cacheLoaded = false;
  private cacheKey: string;
  private nodeCachePath: string | null = null; // Store the determined path
  private cacheTtlMs: number;
  private log: LoggerFn; // Add logger property

  constructor(options: CacheManagerOptions = {}) {
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.cacheKey = options.localStorageKey ?? DEFAULT_LOCAL_STORAGE_KEY;
    // Use provided logger or a no-op function if none is given
    this.log = options.logger || (() => {});

    // Determine Node.js cache path in constructor
    if (isNode) {
      if (options.nodeCachePath) {
        // Use user-provided path directly
        this.nodeCachePath = options.nodeCachePath;
      } else {
        // Default to system temp directory if no path provided
        try {
          this.nodeCachePath = path.join(os.tmpdir(), DEFAULT_NODE_CACHE_FILENAME);
        } catch (e) {
          // Use console.error directly here as logger might not be fully set up
          console.error("Error determining default Node.js cache path in temp dir:", e);
          this.nodeCachePath = null; // Fallback if temp dir fails
        }
      }
      if (this.nodeCachePath) {
        this.log("info", `CacheManager (Node.js): Using cache path: ${this.nodeCachePath}`);
      } else {
        this.log("warn", "CacheManager (Node.js): Could not determine cache path. Caching will be disabled.");
      }
    }
  }

  private async loadCache(): Promise<void> {
    if (this.cacheLoaded) return;

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
        this.cache = {}; // Reset cache on error
      }
    } else if (isNode && this.nodeCachePath) {
      // Use the instance path
      try {
        const rawData = await fs.readFile(this.nodeCachePath, "utf-8");
        this.cache = JSON.parse(rawData);
        this.log("debug", `CacheManager (Node.js): Loaded cache from file (${this.nodeCachePath})`);
      } catch (error: any) {
        if (error.code === "ENOENT") {
          // File doesn't exist, which is fine on first load
          this.log("debug", `CacheManager (Node.js): Cache file not found (${this.nodeCachePath}), initializing empty cache.`);
          this.cache = {};
        } else {
          this.log("error", `CacheManager (Node.js): Failed to load cache from file (${this.nodeCachePath}):`, error);
          this.cache = {}; // Reset cache on other errors
        }
      }
    }
    this.cacheLoaded = true;
  }

  private async saveCache(): Promise<void> {
    if (!this.cacheLoaded) {
      this.log("warn", "CacheManager: Attempted to save cache before loading.");
      return;
    }

    if (isBrowser) {
      try {
        window.localStorage.setItem(this.cacheKey, JSON.stringify(this.cache));
        this.log("debug", `CacheManager (Browser): Saved cache to localStorage (key: ${this.cacheKey})`);
      } catch (error) {
        this.log("error", `CacheManager (Browser): Failed to save cache to localStorage (key: ${this.cacheKey}):`, error);
      }
    } else if (isNode && this.nodeCachePath) {
      // Use the instance path
      try {
        // Ensure directory exists before writing
        const dir = path.dirname(this.nodeCachePath);
        await fs.mkdir(dir, { recursive: true });
        // Save detailed latency map
        await fs.writeFile(this.nodeCachePath, JSON.stringify(this.cache, null, 2));
        this.log("debug", `CacheManager (Node.js): Saved cache to file (${this.nodeCachePath})`);
      } catch (error) {
        this.log("error", `CacheManager (Node.js): Failed to save cache to file (${this.nodeCachePath}):`, error);
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
    this.log("debug", `CacheManager: Cache miss or expired for chainId ${chainId}`);
    return null;
  }

  // Update method signature to accept the detailed map
  async updateChainCache(chainId: number, latencyMap: Record<string, LatencyTestResult>, fastestRpc: string | null): Promise<void> {
    await this.loadCache();
    this.log("debug", `CacheManager: Updating cache for chainId ${chainId}`, { fastestRpc, latencyMapCount: Object.keys(latencyMap || {}).length });
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
