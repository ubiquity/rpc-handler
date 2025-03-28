import { beforeEach, describe, expect, it, mock, Mock } from 'bun:test';
import { ChainlistDataSource } from '../src/chainlist-data-source.js'; // Import real one
import type { LatencyTestResult } from '../src/latency-tester.js'; // Import type
import { RpcSelector } from '../src/rpc-selector.js';

// --- Tests ---
describe('RpcSelector (using Whitelist)', () => {
  let dataSource: ChainlistDataSource; // Real instance
  let mockCacheManager: any; // Mocked instance
  let mockLatencyTester: any; // Mocked instance
  let rpcSelector: RpcSelector;

  // Mock Functions for CacheManager and LatencyTester
  let mockGetFastestRpcFn: Mock<(...args: any[]) => Promise<string | null>>;
  let mockGetLatencyMapFn: Mock<(...args: any[]) => Promise<Record<string, LatencyTestResult> | null>>;
  let mockUpdateChainCacheFn: Mock<(...args: any[]) => Promise<void>>;
  let mockTestRpcUrlsFn: Mock<(...args: any[]) => Promise<Record<string, LatencyTestResult>>>;
  let mockCacheStore: Record<number, any>;

  beforeEach(() => {
    mockCacheStore = {};

    // Define mock function implementations
    mockGetFastestRpcFn = mock(async (chainId: number): Promise<string | null> => {
        const entry = mockCacheStore[chainId];
        if (entry && (Date.now() - entry.lastTested < 60*60*1000)) {
             return entry.fastestRpc ?? null;
        }
        return null;
    });
     mockGetLatencyMapFn = mock(async (chainId: number): Promise<Record<string, LatencyTestResult> | null> => {
        const entry = mockCacheStore[chainId];
        // RpcSelector uses getLatencyMap which might return expired data
        // So we don't check TTL here, unlike getFastestRpc mock
        return entry?.latencyMap ?? null;
    });
    mockUpdateChainCacheFn = mock(async (chainId: number, latencyMap: Record<string, LatencyTestResult>, fastestRpc: string | null): Promise<void> => {
        mockCacheStore[chainId] = { fastestRpc, latencyMap, lastTested: Date.now() };
    });
    mockTestRpcUrlsFn = mock(async (urls: string[]): Promise<Record<string, LatencyTestResult>> => {
      const results: Record<string, LatencyTestResult> = {};
      urls.forEach(url => {
        let latency = 200 + Math.random() * 100;
        let status: LatencyTestResult['status'] = 'ok';
        if (url.includes('cloudflare')) latency = 50;
        else if (url.includes('ankr')) latency = 100;
        else if (url.includes('llamarpc')) latency = 75;
        else if (url.includes('publicnode')) latency = 60;
        else if (url.includes('drpc.org')) { latency = Infinity; status = 'timeout'; }
        results[url] = { url, latency, status };
      });
      return results;
    });

    // Create REAL DataSource instance
    dataSource = new ChainlistDataSource();

    // Create MOCK objects for CacheManager and LatencyTester, adding missing properties
    mockCacheManager = {
      getFastestRpc: mockGetFastestRpcFn,
      getLatencyMap: mockGetLatencyMapFn,
      updateChainCache: mockUpdateChainCacheFn,
      // Add missing properties/methods with dummy values/mocks
      cache: {},
      cacheLoaded: true,
      cacheKey: 'test-cache',
      cacheTtlMs: 3600000,
      loadCache: mock(async () => {}),
      saveCache: mock(async () => {}),
      getRawChainCache: mock(async (chainId: number) => mockCacheStore[chainId] ?? null), // Add this
      getChainCache: mock(async (chainId: number) => { // Simulate TTL check for this if needed
          const entry = mockCacheStore[chainId];
          if (entry && (Date.now() - entry.lastTested < 60*60*1000)) {
              return entry;
          }
          return null;
      }),
    };
    mockLatencyTester = {
      testRpcUrls: mockTestRpcUrlsFn,
       // Add missing properties/methods with dummy values/mocks
      timeoutMs: 5000,
      _makeRpcCall: mock(async () => ({ jsonrpc: '2.0', id: 1, result: null })),
      testSingleRpc: mock(async (url: string) => ({ url, latency: Infinity, status: 'network_error' })),
    };

    // Instantiate RpcSelector with REAL dataSource and MOCKED cache/tester
    rpcSelector = new RpcSelector(
        dataSource,
        mockCacheManager as any, // Keep 'as any' for simplicity
        mockLatencyTester as any // Keep 'as any' for simplicity
    );
  });

  // --- Tests ---
  it('should find the fastest RPC when cache is empty (using whitelist)', async () => {
    const chainId = 1;
    const fastest = await rpcSelector.findFastestRpc(chainId);

    expect(fastest).toBe('https://cloudflare-eth.com');
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId);
    expect(mockTestRpcUrlsFn).toHaveBeenCalledTimes(1);
    expect(mockTestRpcUrlsFn).toHaveBeenCalledWith(expect.arrayContaining([
        "https://cloudflare-eth.com", "https://rpc.ankr.com/eth", /* ... other whitelisted */
    ]));
    expect(mockUpdateChainCacheFn).toHaveBeenCalledWith(chainId, expect.any(Object), fastest);
  });

   it('should return fastest RPC from cache if valid', async () => {
    const chainId = 1;
    const cachedRpc = 'https://cached-rpc.com';
    mockCacheStore[chainId] = {
        fastestRpc: cachedRpc,
        latencyMap: {},
        lastTested: Date.now()
    };

    const fastest = await rpcSelector.findFastestRpc(chainId);

    expect(fastest).toBe(cachedRpc);
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId);
    expect(mockTestRpcUrlsFn).not.toHaveBeenCalled();
    expect(mockUpdateChainCacheFn).not.toHaveBeenCalled();
  });

   it('should return null if no RPCs are found for the chain', async () => {
    const chainId = 9999999;
    const fastest = await rpcSelector.findFastestRpc(chainId);

    expect(fastest).toBeNull();
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId);
    // Real getRpcUrls is called
    expect(mockTestRpcUrlsFn).not.toHaveBeenCalled();
    expect(mockUpdateChainCacheFn).not.toHaveBeenCalled();
  });

  it('should return null if all whitelisted RPCs fail latency test', async () => {
    const chainId = 1;
    // Override mock to return only failing results for expected URLs
    mockTestRpcUrlsFn.mockImplementationOnce(async (urls: string[]) => {
        const results: Record<string, LatencyTestResult> = {};
        urls.forEach(url => {
            results[url] = { url, latency: Infinity, status: 'timeout' };
        });
        return results;
    });

    const fastest = await rpcSelector.findFastestRpc(chainId);

    expect(fastest).toBeNull();
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId);
    // Real getRpcUrls is called
    expect(mockTestRpcUrlsFn).toHaveBeenCalledTimes(1);
    expect(mockUpdateChainCacheFn).toHaveBeenCalledWith(chainId, expect.any(Object), null);
  });

  it('should find the next fastest RPC from cache', async () => {
    const chainId = 1;
    mockCacheStore[chainId] = {
        fastestRpc: 'https://cloudflare-eth.com', // 50ms
        latencyMap: {
            'https://cloudflare-eth.com': { url: 'https://cloudflare-eth.com', latency: 50, status: 'ok' },
            'https://ethereum-rpc.publicnode.com': { url: 'https://ethereum-rpc.publicnode.com', latency: 60, status: 'ok' }, // Next fastest
            'https://eth.llamarpc.com': { url: 'https://eth.llamarpc.com', latency: 75, status: 'ok' },
            'https://rpc.ankr.com/eth': { url: 'https://rpc.ankr.com/eth', latency: 100, status: 'ok' },
            'https://eth.drpc.org': { url: 'https://eth.drpc.org', latency: Infinity, status: 'timeout' },
        },
        lastTested: Date.now()
    };

    const nextFastest = await rpcSelector.findNextFastestRpc(chainId);

    expect(nextFastest).toBe('https://ethereum-rpc.publicnode.com'); // Expect 60ms one
    expect(mockGetLatencyMapFn).toHaveBeenCalledWith(chainId);
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId);
  });

   it('should return null for next fastest if cache has no latency map', async () => {
    const chainId = 1;
    mockCacheStore[chainId] = {
        fastestRpc: 'https://cloudflare-eth.com',
        latencyMap: null,
        lastTested: Date.now()
    };
     const nextFastest = await rpcSelector.findNextFastestRpc(chainId);
     expect(nextFastest).toBeNull();
     expect(mockGetLatencyMapFn).toHaveBeenCalledWith(chainId);
   });

   it('should return null for next fastest if only one OK RPC in latency map', async () => {
    const chainId = 1;
    mockCacheStore[chainId] = {
        fastestRpc: 'https://cloudflare-eth.com',
        latencyMap: {
            'https://rpc.ankr.com/eth': { url: 'https://rpc.ankr.com/eth', latency: Infinity, status: 'timeout' },
            'https://cloudflare-eth.com': { url: 'https://cloudflare-eth.com', latency: 50, status: 'ok' },
         },
        lastTested: Date.now()
    };
     const nextFastest = await rpcSelector.findNextFastestRpc(chainId);
     expect(nextFastest).toBeNull();
     expect(mockGetLatencyMapFn).toHaveBeenCalledWith(chainId);
   });

});
