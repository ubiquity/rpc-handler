/// <reference lib="deno.ns" />
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

// Environment check removed, assuming Deno environment with KV access

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
  private cacheKey: string; // Used as KV key prefix/identifier
  // nodeCachePath removed
  private cacheTtlMs: number;
  private log: LoggerFn;
  // Deno KV instance placeholder
  private kv: Deno.Kv | null = null;

  constructor(options: CacheManagerOptions = {}) {
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    // Keep option name localStorageKey for now, but use it as KV key
    this.cacheKey = options.localStorageKey ?? DEFAULT_LOCAL_STORAGE_KEY;
    this.log = options.logger || (() => {});
    // No Node path determination needed here
  }

  // Helper to ensure KV is open
  private async ensureKvOpen(): Promise<Deno.Kv> {
    if (!this.kv) {
      this.log("debug", "CacheManager (Deno): Opening Deno KV store...");
      try {
        // Deno Deploy automatically provides the path. For local dev, it uses default.
        this.kv = await Deno.openKv();
        this.log("debug", "CacheManager (Deno): Deno KV store opened.");
      } catch (error) {
        this.log("error", "CacheManager (Deno): Failed to open Deno KV store:", error);
        throw new Error(`Failed to open Deno KV store: ${error.message}`);
      }
    }
    return this.kv;
  }

  private async loadCache(): Promise<void> {
    if (this.cacheLoaded) return;

    // --- Deno KV Implementation ---
    this.log("debug", `CacheManager (Deno): Attempting to load cache from Deno KV (key: ${this.cacheKey})`);
    try {
      const kv = await this.ensureKvOpen();
      // Use a single key to store the entire cache object
      const result = await kv.get<CacheData>([this.cacheKey]);

      if (result.value !== null) {
        this.cache = result.value;
        this.log("debug", `CacheManager (Deno): Loaded cache from Deno KV (key: ${this.cacheKey})`);
      } else {
        this.log("debug", `CacheManager (Deno): No cache found in Deno KV (key: ${this.cacheKey})`);
        this.cache = {}; // Initialize empty if not found
      }
    } catch (error) {
      this.log("error", `CacheManager (Deno): Failed to load cache from Deno KV (key: ${this.cacheKey}):`, error);
      this.cache = {}; // Initialize empty on error
    }
    // --- End Deno KV ---

    this.cacheLoaded = true;
  }

  private async saveCache(): Promise<void> {
    if (!this.cacheLoaded) {
      this.log("warn", "CacheManager: Attempted to save cache before loading.");
      return;
    }

    // --- Deno KV Implementation ---
    this.log("debug", `CacheManager (Deno): Attempting to save cache to Deno KV (key: ${this.cacheKey})`);
    try {
      const kv = await this.ensureKvOpen();
      await kv.set([this.cacheKey], this.cache);
      this.log("debug", `CacheManager (Deno): Saved cache to Deno KV (key: ${this.cacheKey})`);
    } catch (error) {
      this.log("error", `CacheManager (Deno): Failed to save cache to Deno KV (key: ${this.cacheKey}):`, error);
    }
    // --- End Deno KV ---
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
