import nodeFs from "node:fs/promises";
import nodeOs from "node:os";
import nodePath from "node:path";
import type { LatencyTestResult } from "./latency-tester.ts";

// Define types (can be shared or redefined)
type LoggerFn = (level: "debug" | "info" | "warn" | "error", message: string, ...optionalParams: any[]) => void;
interface ChainCache {
  fastestRpc: string | null;
  latencyMap: Record<string, LatencyTestResult>;
  lastTested: number;
}
type CacheData = Record<number, ChainCache>;

const DEFAULT_NODE_CACHE_FILENAME = "permit2-rpc-manager.cache.json";

/**
 * Node.js specific cache handler using the file system.
 * This is intended to be used internally or explicitly by Node applications.
 */
export class NodeCacheHandler {
  private nodeCachePath: string | null = null;
  private log: LoggerFn;

  constructor(userPath?: string, logger?: LoggerFn) {
    this.log = logger || (() => {});
    this._initializeNodePath(userPath);
  }

  private _initializeNodePath(userPath?: string) {
    if (userPath) {
      this.nodeCachePath = userPath;
      this.log("info", `NodeCacheHandler: Using user-provided cache path: ${this.nodeCachePath}`);
    } else {
      try {
        this.nodeCachePath = nodePath.join(nodeOs.tmpdir(), DEFAULT_NODE_CACHE_FILENAME);
        this.log("info", `NodeCacheHandler: Determined default cache path: ${this.nodeCachePath}`);
      } catch (e) {
        this.log("error", "NodeCacheHandler: Error determining default cache path:", e);
        this.nodeCachePath = null;
      }
    }
     if (!this.nodeCachePath) {
       this.log("warn", "NodeCacheHandler: Could not determine cache path. File caching will be disabled.");
     }
  }

  async loadCacheFromFile(): Promise<CacheData> {
    if (!this.nodeCachePath) {
        this.log("warn", "NodeCacheHandler: Skipping file cache load (no path).");
        return {};
    }
    try {
      const rawData = await nodeFs.readFile(this.nodeCachePath, "utf-8");
      this.log("debug", `NodeCacheHandler: Loaded cache from file (${this.nodeCachePath})`);
      return JSON.parse(rawData);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        this.log("debug", `NodeCacheHandler: Cache file not found (${this.nodeCachePath}), returning empty cache.`);
        return {};
      } else {
        this.log("error", `NodeCacheHandler: Failed to load cache from file (${this.nodeCachePath}):`, error);
        return {}; // Return empty on other errors
      }
    }
  }

  async saveCacheToFile(cacheData: CacheData): Promise<void> {
     if (!this.nodeCachePath) {
        this.log("warn", "NodeCacheHandler: Skipping file cache save (no path).");
        return;
     }
     try {
        const dir = nodePath.dirname(this.nodeCachePath);
        await nodeFs.mkdir(dir, { recursive: true });
        await nodeFs.writeFile(this.nodeCachePath, JSON.stringify(cacheData, null, 2));
        this.log("debug", `NodeCacheHandler: Saved cache to file (${this.nodeCachePath})`);
     } catch (error) {
        this.log("error", `NodeCacheHandler: Failed to save cache to file (${this.nodeCachePath}):`, error);
     }
  }
}
