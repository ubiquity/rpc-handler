import { beforeEach, describe, expect, it, mock, Mock } from 'bun:test';
// Import classes needed for type casting mocks if desired, otherwise remove
// import { CacheManager } from '../src/cache-manager.js';
// import { ChainlistDataSource } from '../src/chainlist-data-source.js';
// import { LatencyTester } from '../src/latency-tester.js';
import { RpcSelector } from '../src/rpc-selector.js';

// --- Tests ---
describe('RpcSelector', () => {
  // Mocks will be created as plain objects with mocked methods
  let mockDataSource: any; // Use 'any' for simplicity with manual mocks
  let mockCacheManager: any;
  let mockLatencyTester: any;
  let rpcSelector: RpcSelector;

  // Mock Functions
  let mockGetRpcUrlsFn: Mock<(...args: any[]) => Promise<string[]>>;
  let mockGetFastestRpcFn: Mock<(...args: any[]) => Promise<string | null>>;
  let mockGetLatencyMapFn: Mock<(...args: any[]) => Promise<Record<string, number> | null>>;
  let mockUpdateChainCacheFn: Mock<(...args: any[]) => Promise<void>>;
  let mockTestRpcUrlsFn: Mock<(...args: any[]) => Promise<Record<string, number>>>;
  let mockCacheStore: Record<number, any>; // Simple object to simulate cache storage

  beforeEach(() => {
    mockCacheStore = {};

    // Define mock function implementations
    mockGetRpcUrlsFn = mock(async (chainId: number): Promise<string[]> => {
       // console.log(`>>> MOCK FN getRpcUrls called with chainId: ${chainId}`); // Keep logs commented out for now
       if (chainId === 1) return ['https://rpc1.com', 'https://rpc2.com', 'https://rpc3.com'];
       if (chainId === 99) return [];
       return [];
    });
    mockGetFastestRpcFn = mock(async (chainId: number): Promise<string | null> => {
        // console.log(`>>> MOCK FN getFastestRpc called with chainId: ${chainId}`);
        const entry = mockCacheStore[chainId];
        if (entry && (Date.now() - entry.lastTested < 60*60*1000)) {
             // console.log(`>>> MOCK FN getFastestRpc returning from cache: ${entry.fastestRpc ?? null}`);
             return entry.fastestRpc ?? null;
        }
        // console.log(`>>> MOCK FN getFastestRpc cache miss/expired for chainId: ${chainId}`);
        return null;
    });
     mockGetLatencyMapFn = mock(async (chainId: number): Promise<Record<string, number> | null> => {
        // console.log(`>>> MOCK FN getLatencyMap called with chainId: ${chainId}`);
        const entry = mockCacheStore[chainId];
        if (entry && (Date.now() - entry.lastTested < 60*60*1000)) {
            return entry.latencyMap ?? null;
        }
        return null;
    });
    mockUpdateChainCacheFn = mock(async (chainId: number, latencyMap: Record<string, number>, fastestRpc: string | null): Promise<void> => {
        // console.log(`>>> MOCK FN updateChainCache called with chainId: ${chainId}, fastestRpc: ${fastestRpc}`);
        mockCacheStore[chainId] = { fastestRpc, latencyMap, lastTested: Date.now() };
    });
    mockTestRpcUrlsFn = mock(async (urls: string[]): Promise<Record<string, number>> => {
      // console.log(`>>> MOCK FN testRpcUrls called with urls: ${urls.join(', ')}`);
      const results: Record<string, number> = {};
      urls.forEach(url => {
        if (url.includes('rpc1')) results[url] = 100;
        else if (url.includes('rpc2')) results[url] = 50;
        else if (url.includes('rpc3')) results[url] = 200;
        else results[url] = Infinity;
      });
      return results;
    });

    // Create plain mock objects implementing the required methods
    mockDataSource = {
      getRpcUrls: mockGetRpcUrlsFn,
    };

    mockCacheManager = {
      getFastestRpc: mockGetFastestRpcFn,
      getLatencyMap: mockGetLatencyMapFn,
      updateChainCache: mockUpdateChainCacheFn,
    };

    mockLatencyTester = {
      testRpcUrls: mockTestRpcUrlsFn,
    };

    // Instantiate RpcSelector with the mock objects, using 'as any'
    rpcSelector = new RpcSelector(
        mockDataSource as any,
        mockCacheManager as any,
        mockLatencyTester as any
    );
  });

  // --- Tests (EXPECTED TO FAIL due to unexplained mocking issue) ---
  it('should find the fastest RPC when cache is empty', async () => {
    const chainId = 1;
    const fastest = await rpcSelector.findFastestRpc(chainId);

    expect(fastest).toBe('https://rpc2.com'); // Fails: returns null
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId); // Fails: not called
    expect(mockGetRpcUrlsFn).toHaveBeenCalledWith(chainId); // Fails: not called
    expect(mockTestRpcUrlsFn).toHaveBeenCalledWith(['https://rpc1.com', 'https://rpc2.com', 'https://rpc3.com']); // Fails: not called
    expect(mockUpdateChainCacheFn).toHaveBeenCalledWith(chainId, expect.any(Object), 'https://rpc2.com'); // Fails: not called
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

    expect(fastest).toBe(cachedRpc); // Fails: returns null
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId); // Fails: not called
    expect(mockGetRpcUrlsFn).not.toHaveBeenCalled();
    expect(mockTestRpcUrlsFn).not.toHaveBeenCalled();
    expect(mockUpdateChainCacheFn).not.toHaveBeenCalled();
  });

   it('should return null if no RPCs are found for the chain', async () => {
    const chainId = 99;
    const fastest = await rpcSelector.findFastestRpc(chainId);

    expect(fastest).toBeNull(); // Passes (by coincidence?)
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId); // Fails: not called
    expect(mockGetRpcUrlsFn).toHaveBeenCalledWith(chainId); // Fails: not called
    expect(mockTestRpcUrlsFn).not.toHaveBeenCalled();
    expect(mockUpdateChainCacheFn).not.toHaveBeenCalled();
  });

  it('should return null if all RPCs fail latency test', async () => {
    const chainId = 1;
    mockTestRpcUrlsFn.mockResolvedValueOnce({
        'https://rpc1.com': Infinity,
        'https://rpc2.com': Infinity,
        'https://rpc3.com': Infinity,
    });

    const fastest = await rpcSelector.findFastestRpc(chainId);

    expect(fastest).toBeNull(); // Passes (by coincidence?)
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId); // Fails: not called
    expect(mockGetRpcUrlsFn).toHaveBeenCalledWith(chainId); // Fails: not called
    expect(mockTestRpcUrlsFn).toHaveBeenCalledWith(['https://rpc1.com', 'https://rpc2.com', 'https://rpc3.com']); // Fails: not called
    expect(mockUpdateChainCacheFn).toHaveBeenCalledWith(chainId, expect.any(Object), null); // Fails: not called
  });

  it('should find the next fastest RPC from cache', async () => {
    const chainId = 1;
    mockCacheStore[chainId] = {
        fastestRpc: 'https://rpc2.com',
        latencyMap: { 'https://rpc1.com': 100, 'https://rpc2.com': 50, 'https://rpc3.com': 200 },
        lastTested: Date.now()
    };

    const nextFastest = await rpcSelector.findNextFastestRpc(chainId);

    expect(nextFastest).toBe('https://rpc1.com'); // Fails: returns null
    expect(mockGetLatencyMapFn).toHaveBeenCalledWith(chainId); // Fails: not called
    expect(mockGetFastestRpcFn).toHaveBeenCalledWith(chainId); // Fails: not called
  });

   it('should return null for next fastest if cache has no latency map', async () => {
    const chainId = 1;
    mockCacheStore[chainId] = {
        fastestRpc: 'https://rpc2.com',
        latencyMap: null,
        lastTested: Date.now()
    };
     const nextFastest = await rpcSelector.findNextFastestRpc(chainId);
     expect(nextFastest).toBeNull(); // Passes (by coincidence?)
     expect(mockGetLatencyMapFn).toHaveBeenCalledWith(chainId); // Fails: not called
   });

   it('should return null for next fastest if only one RPC in latency map', async () => {
    const chainId = 1;
    mockCacheStore[chainId] = {
        fastestRpc: 'https://rpc2.com',
        latencyMap: { 'https://rpc2.com': 50 },
        lastTested: Date.now()
    };
     const nextFastest = await rpcSelector.findNextFastestRpc(chainId);
     expect(nextFastest).toBeNull(); // Passes (by coincidence?)
     expect(mockGetLatencyMapFn).toHaveBeenCalledWith(chainId); // Fails: not called
   });

});
