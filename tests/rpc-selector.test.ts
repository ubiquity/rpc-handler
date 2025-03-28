import { beforeEach, describe, expect, it, mock, Mock } from "bun:test";
import { ChainlistDataSource } from "../src/chainlist-data-source.js";
import type { LatencyTestResult, LatencyTestStatus } from "../src/latency-tester.js";
import { RpcSelector } from "../src/rpc-selector.js";

describe("RpcSelector (using Whitelist)", () => {
  let dataSource: ChainlistDataSource;
  let mockCacheManager: any;
  let mockLatencyTester: any;
  let rpcSelector: RpcSelector;

  let mockGetFastestRpcFn: Mock<(...args: any[]) => Promise<string | null>>;
  let mockGetLatencyMapFn: Mock<(...args: any[]) => Promise<Record<string, LatencyTestResult> | null>>;
  let mockUpdateChainCacheFn: Mock<(...args: any[]) => Promise<void>>;
  let mockTestRpcUrlsFn: Mock<(...args: any[]) => Promise<Record<string, LatencyTestResult>>>;
  let mockCacheStore: Record<number, any>;

  beforeEach(() => {
    mockCacheStore = {};

    mockGetFastestRpcFn = mock(async (chainId: number): Promise<string | null> => {
      const entry = mockCacheStore[chainId];
      // Simulate TTL check for getFastestRpc
      if (entry && Date.now() - entry.lastTested < 60 * 60 * 1000) {
        return entry.fastestRpc ?? null;
      }
      return null;
    });
    mockGetLatencyMapFn = mock(async (chainId: number): Promise<Record<string, LatencyTestResult> | null> => {
      const entry = mockCacheStore[chainId];
      // getLatencyMap can return expired data
      return entry?.latencyMap ?? null;
    });
    mockUpdateChainCacheFn = mock(async (chainId: number, latencyMap: Record<string, LatencyTestResult>, fastestRpc: string | null): Promise<void> => {
      mockCacheStore[chainId] = { fastestRpc, latencyMap, lastTested: Date.now() };
    });
    // Default mock for testRpcUrls - returns 'ok' status for some
    mockTestRpcUrlsFn = mock(async (urls: string[]): Promise<Record<string, LatencyTestResult>> => {
      const results: Record<string, LatencyTestResult> = {};
      urls.forEach((url) => {
        let latency = 200 + Math.random() * 100;
        let status: LatencyTestStatus = "ok";
        if (url.includes("cloudflare")) latency = 50;
        else if (url.includes("ankr")) latency = 100;
        else if (url.includes("llamarpc")) latency = 75;
        else if (url.includes("publicnode")) latency = 60;
        else if (url.includes("drpc.org")) {
          latency = Infinity;
          status = "timeout";
        } else if (url.includes("1rpc.io")) {
          latency = Infinity;
          status = "wrong_bytecode";
        }
        results[url] = { url, latency, status };
      });
      return results;
    });

    dataSource = new ChainlistDataSource();
    mockCacheManager = {
      getFastestRpc: mockGetFastestRpcFn,
      getLatencyMap: mockGetLatencyMapFn,
      updateChainCache: mockUpdateChainCacheFn,
      cache: {},
      cacheLoaded: true,
      cacheKey: "test-cache",
      cacheTtlMs: 3600000,
      loadCache: mock(async () => {}),
      saveCache: mock(async () => {}),
      getRawChainCache: mock(async (chainId: number) => mockCacheStore[chainId] ?? null),
      getChainCache: mock(async (chainId: number) => {
        const entry = mockCacheStore[chainId];
        if (entry && Date.now() - entry.lastTested < 60 * 60 * 1000) return entry;
        return null;
      }),
    };
    mockLatencyTester = {
      testRpcUrls: mockTestRpcUrlsFn,
      timeoutMs: 5000,
      _makeRpcCall: mock(async () => ({ jsonrpc: "2.0", id: 1, result: null })),
      testSingleRpc: mock(async (url: string) => ({ url, latency: Infinity, status: "network_error" })),
    };

    rpcSelector = new RpcSelector(dataSource, mockCacheManager as any, mockLatencyTester as any);
  });

  it("should find the fastest RPC with status ok when available", async () => {
    const chainId = 1;
    const fastest = await rpcSelector.findFastestRpc(chainId);
    expect(fastest).toBe("https://cloudflare-eth.com"); // 50ms, ok
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId);
    expect(mockTestRpcUrlsFn).toHaveBeenCalledTimes(1);
    expect(mockUpdateChainCacheFn).toHaveBeenCalledWith(chainId, expect.any(Object), fastest);
  });

  it("should fallback to fastest syncing RPC if no ok RPCs are available", async () => {
    const chainId = 1;
    // Override mock to make all 'ok' fail, but leave one 'syncing'
    mockTestRpcUrlsFn.mockImplementationOnce(async (urls: string[]) => {
      const results: Record<string, LatencyTestResult> = {};
      urls.forEach((url) => {
        let latency = Infinity;
        let status: LatencyTestStatus = "timeout";
        // Make one RPC 'syncing' with a measurable latency
        if (url.includes("llamarpc")) {
          latency = 75;
          status = "syncing";
        }
        results[url] = { url, latency, status };
      });
      return results;
    });

    const fastest = await rpcSelector.findFastestRpc(chainId);
    expect(fastest).toBe("https://eth.llamarpc.com"); // The syncing one
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId);
    expect(mockTestRpcUrlsFn).toHaveBeenCalledTimes(1);
    expect(mockUpdateChainCacheFn).toHaveBeenCalledWith(chainId, expect.any(Object), fastest);
  });

  it("should NOT fallback to wrong_bytecode RPC even if its fastest", async () => {
    const chainId = 1;
    // Override mock: one 'wrong_bytecode', others timeout
    mockTestRpcUrlsFn.mockImplementationOnce(async (urls: string[]) => {
      const results: Record<string, LatencyTestResult> = {};
      urls.forEach((url) => {
        let latency = Infinity;
        let status: LatencyTestStatus = "timeout";
        if (url.includes("1rpc.io")) {
          latency = 20;
          status = "wrong_bytecode";
        } // Fastest but wrong bytecode
        results[url] = { url, latency, status };
      });
      return results;
    });
    const fastest = await rpcSelector.findFastestRpc(chainId);
    expect(fastest).toBeNull(); // Should return null as wrong_bytecode is invalid
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId);
    expect(mockTestRpcUrlsFn).toHaveBeenCalledTimes(1);
    expect(mockUpdateChainCacheFn).toHaveBeenCalledWith(chainId, expect.any(Object), null);
  });

  it("should return fastest RPC from cache if valid (ok or syncing)", async () => {
    const chainId = 1;
    const cachedRpc = "https://cached-syncing-rpc.com";
    // Simulate cache having a 'syncing' RPC as fastest
    mockCacheStore[chainId] = {
      fastestRpc: cachedRpc,
      latencyMap: { [cachedRpc]: { url: cachedRpc, latency: 100, status: "syncing" } },
      lastTested: Date.now(),
    };
    const fastest = await rpcSelector.findFastestRpc(chainId);
    expect(fastest).toBe(cachedRpc); // Should still return the cached one
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId);
    expect(mockTestRpcUrlsFn).not.toHaveBeenCalled();
  });

  it("should re-evaluate if cached fastest RPC is no longer valid (e.g., wrong_bytecode)", async () => {
    const chainId = 1;
    const badCachedRpc = "https://bad-cached-rpc.com";
    mockCacheStore[chainId] = {
      fastestRpc: badCachedRpc, // This one is cached as fastest
      // But the detailed map shows it failed the last test
      latencyMap: {
        [badCachedRpc]: { url: badCachedRpc, latency: Infinity, status: "wrong_bytecode" },
        "https://cloudflare-eth.com": { url: "https://cloudflare-eth.com", latency: 50, status: "ok" },
      },
      lastTested: Date.now(), // Assume cache TTL is fine, but content is bad
    };

    // Override getFastestRpc mock to initially return the bad one
    mockGetFastestRpcFn.mockResolvedValueOnce(badCachedRpc);

    const fastest = await rpcSelector.findFastestRpc(chainId);

    // Should ignore bad cache and re-evaluate based on map (or re-test if map was expired)
    // In this case, it should find cloudflare from the map provided by getLatencyMap
    expect(fastest).toBe("https://cloudflare-eth.com");
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId);
    expect(mockGetLatencyMapFn).toHaveBeenCalledWith(chainId); // Called to check status
    expect(mockTestRpcUrlsFn).not.toHaveBeenCalled(); // Should use existing map if not expired
    // Cache shouldn't be updated again if re-evaluating from existing map
    // expect(mockUpdateChainCacheFn).not.toHaveBeenCalled();
  });

  it("should return null if no RPCs are found for the chain", async () => {
    const chainId = 9999999;
    const fastest = await rpcSelector.findFastestRpc(chainId);
    expect(fastest).toBeNull();
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId);
    expect(mockTestRpcUrlsFn).not.toHaveBeenCalled();
    expect(mockUpdateChainCacheFn).not.toHaveBeenCalled();
  });

  it("should return null if all whitelisted RPCs fail latency test", async () => {
    const chainId = 1;
    mockTestRpcUrlsFn.mockImplementationOnce(async (urls: string[]) => {
      const results: Record<string, LatencyTestResult> = {};
      urls.forEach((url) => {
        results[url] = { url, latency: Infinity, status: "timeout" };
      });
      return results;
    });
    const fastest = await rpcSelector.findFastestRpc(chainId);
    expect(fastest).toBeNull();
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId);
    expect(mockTestRpcUrlsFn).toHaveBeenCalledTimes(1);
    expect(mockUpdateChainCacheFn).toHaveBeenCalledWith(chainId, expect.any(Object), null);
  });

  // --- findNextFastestRpc Tests ---

  it("should find the next fastest OK RPC from cache", async () => {
    const chainId = 1;
    mockCacheStore[chainId] = {
      fastestRpc: "https://cloudflare-eth.com", // 50ms
      latencyMap: {
        "https://cloudflare-eth.com": { url: "https://cloudflare-eth.com", latency: 50, status: "ok" },
        "https://ethereum-rpc.publicnode.com": { url: "https://ethereum-rpc.publicnode.com", latency: 60, status: "ok" }, // Next OK
        "https://eth.llamarpc.com": { url: "https://eth.llamarpc.com", latency: 75, status: "ok" },
      },
      lastTested: Date.now(),
    };
    const nextFastest = await rpcSelector.findNextFastestRpc(chainId);
    expect(nextFastest).toBe("https://ethereum-rpc.publicnode.com");
    expect(mockGetLatencyMapFn).toHaveBeenCalledWith(chainId);
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId); // Called internally by findNextFastestRpc
  });

  it("should find the next fastest SYNCING RPC if no other OK RPCs exist", async () => {
    const chainId = 1;
    mockCacheStore[chainId] = {
      fastestRpc: "https://cloudflare-eth.com", // 50ms, ok
      latencyMap: {
        "https://cloudflare-eth.com": { url: "https://cloudflare-eth.com", latency: 50, status: "ok" },
        "https://syncing-rpc.com": { url: "https://syncing-rpc.com", latency: 100, status: "syncing" }, // Next best is syncing
        "https://timeout-rpc.com": { url: "https://timeout-rpc.com", latency: Infinity, status: "timeout" },
      },
      lastTested: Date.now(),
    };
    const nextFastest = await rpcSelector.findNextFastestRpc(chainId);
    expect(nextFastest).toBe("https://syncing-rpc.com");
    expect(mockGetLatencyMapFn).toHaveBeenCalledWith(chainId);
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId);
  });

  it("should return null for next fastest if cache has no latency map", async () => {
    const chainId = 1;
    mockCacheStore[chainId] = { fastestRpc: "https://cloudflare-eth.com", latencyMap: null, lastTested: Date.now() };
    const nextFastest = await rpcSelector.findNextFastestRpc(chainId);
    expect(nextFastest).toBeNull();
    expect(mockGetLatencyMapFn).toHaveBeenCalledWith(chainId);
  });

  it("should return null for next fastest if only one OK/Syncing RPC in latency map", async () => {
    const chainId = 1;
    mockCacheStore[chainId] = {
      fastestRpc: "https://cloudflare-eth.com",
      latencyMap: {
        "https://timeout-rpc.com": { url: "https://timeout-rpc.com", latency: Infinity, status: "timeout" },
        "https://cloudflare-eth.com": { url: "https://cloudflare-eth.com", latency: 50, status: "ok" },
      },
      lastTested: Date.now(),
    };
    const nextFastest = await rpcSelector.findNextFastestRpc(chainId);
    expect(nextFastest).toBeNull();
    expect(mockGetLatencyMapFn).toHaveBeenCalledWith(chainId);
  });
});
