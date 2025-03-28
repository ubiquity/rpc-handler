import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { CacheManager } from '../src/cache-manager.js';
import { ChainlistDataSource } from '../src/chainlist-data-source.js';
import { LatencyTester } from '../src/latency-tester.js';
import { RpcSelector } from '../src/rpc-selector.js';

// --- Mocks ---
// Mock ChainlistDataSource
mock.module('../src/chainlist-data-source.js', () => ({
  ChainlistDataSource: class {
    getRpcUrls = mock(async (chainId: number): Promise<string[]> => {
      if (chainId === 1) {
        return ['https://rpc1.com', 'https://rpc2.com', 'https://rpc3.com'];
      }
      if (chainId === 99) { // Chain with no RPCs
        return [];
      }
      return []; // Default empty
    });
    // Add other methods if needed by RpcSelector
  }
}));

// Mock CacheManager
mock.module('../src/cache-manager.js', () => ({
  CacheManager: class {
    cache: Record<number, any> = {}; // Simplified cache for testing
    getFastestRpc = mock(async (chainId: number): Promise<string | null> => {
        return this.cache[chainId]?.fastestRpc ?? null;
    });
    getLatencyMap = mock(async (chainId: number): Promise<Record<string, number> | null> => {
        return this.cache[chainId]?.latencyMap ?? null;
    });
    updateChainCache = mock(async (chainId: number, latencyMap: Record<string, number>, fastestRpc: string | null): Promise<void> => {
        this.cache[chainId] = { fastestRpc, latencyMap, lastTested: Date.now() };
    });
    // Add constructor mock if needed, assuming default TTL for now
  }
}));

// Mock LatencyTester
mock.module('../src/latency-tester.js', () => ({
  LatencyTester: class {
    testRpcUrls = mock(async (urls: string[]): Promise<Record<string, number>> => {
      // Simulate latency results for testing
      const results: Record<string, number> = {};
      urls.forEach(url => {
        if (url.includes('rpc1')) results[url] = 100; // Fast
        else if (url.includes('rpc2')) results[url] = 50;  // Fastest
        else if (url.includes('rpc3')) results[url] = 200; // Slow
        else results[url] = Infinity; // Default to failure
      });
      return results;
    });
  }
}));

// --- Tests ---
describe('RpcSelector', () => {
  let dataSource: ChainlistDataSource;
  let cacheManager: CacheManager;
  let latencyTester: LatencyTester;
  let rpcSelector: RpcSelector;

  beforeEach(() => {
    // Instantiate mocks (classes are already mocked via mock.module)
    dataSource = new ChainlistDataSource();
    cacheManager = new CacheManager();
    latencyTester = new LatencyTester();
    rpcSelector = new RpcSelector(dataSource, cacheManager, latencyTester);

    // Clear mock function calls and internal state if necessary
    (dataSource.getRpcUrls as any).mockClear();
    (cacheManager.getFastestRpc as any).mockClear();
    (cacheManager.getLatencyMap as any).mockClear();
    (cacheManager.updateChainCache as any).mockClear();
    (latencyTester.testRpcUrls as any).mockClear();
    (cacheManager as any).cache = {}; // Reset simplified cache state
  });

  it('should find the fastest RPC when cache is empty', async () => {
    const chainId = 1;
    const fastest = await rpcSelector.findFastestRpc(chainId);

    expect(fastest).toBe('https://rpc2.com');
    expect(dataSource.getRpcUrls).toHaveBeenCalledWith(chainId);
    expect(latencyTester.testRpcUrls).toHaveBeenCalledWith(['https://rpc1.com', 'https://rpc2.com', 'https://rpc3.com']);
    expect(cacheManager.updateChainCache).toHaveBeenCalledWith(
      chainId,
      {
        'https://rpc1.com': 100,
        'https://rpc2.com': 50,
        'https://rpc3.com': 200,
      },
      'https://rpc2.com'
    );
    expect(cacheManager.getFastestRpc).toHaveBeenCalledTimes(1); // Called once initially
  });

  it('should return fastest RPC from cache if valid', async () => {
    const chainId = 1;
    // Pre-populate cache
    (cacheManager as any).cache[chainId] = {
        fastestRpc: 'https://cached-rpc.com',
        latencyMap: {}, // Not needed for this specific check
        lastTested: Date.now() // Assume recent test
    };

    const fastest = await rpcSelector.findFastestRpc(chainId);

    expect(fastest).toBe('https://cached-rpc.com');
    expect(cacheManager.getFastestRpc).toHaveBeenCalledWith(chainId);
    expect(dataSource.getRpcUrls).not.toHaveBeenCalled();
    expect(latencyTester.testRpcUrls).not.toHaveBeenCalled();
    expect(cacheManager.updateChainCache).not.toHaveBeenCalled();
  });

   it('should return null if no RPCs are found for the chain', async () => {
    const chainId = 99; // Mock returns empty array for this chain
    const fastest = await rpcSelector.findFastestRpc(chainId);

    expect(fastest).toBeNull();
    expect(dataSource.getRpcUrls).toHaveBeenCalledWith(chainId);
    expect(latencyTester.testRpcUrls).not.toHaveBeenCalled();
    expect(cacheManager.updateChainCache).not.toHaveBeenCalled();
  });

  it('should return null if all RPCs fail latency test', async () => {
    const chainId = 1;
    // Override latency tester mock for this test
    (latencyTester.testRpcUrls as any).mockResolvedValueOnce({
        'https://rpc1.com': Infinity,
        'https://rpc2.com': Infinity,
        'https://rpc3.com': Infinity,
    });

    const fastest = await rpcSelector.findFastestRpc(chainId);

    expect(fastest).toBeNull();
    expect(dataSource.getRpcUrls).toHaveBeenCalledWith(chainId);
    expect(latencyTester.testRpcUrls).toHaveBeenCalledWith(['https://rpc1.com', 'https://rpc2.com', 'https://rpc3.com']);
    expect(cacheManager.updateChainCache).toHaveBeenCalledWith(
      chainId,
      {
        'https://rpc1.com': Infinity,
        'https://rpc2.com': Infinity,
        'https://rpc3.com': Infinity,
      },
      null // Expect null as fastest when all fail
    );
  });

  it('should find the next fastest RPC from cache', async () => {
    const chainId = 1;
     // Pre-populate cache
    (cacheManager as any).cache[chainId] = {
        fastestRpc: 'https://rpc2.com', // Fastest
        latencyMap: {
            'https://rpc1.com': 100, // Next fastest
            'https://rpc2.com': 50,
            'https://rpc3.com': 200,
        },
        lastTested: Date.now()
    };

    const nextFastest = await rpcSelector.findNextFastestRpc(chainId);

    expect(nextFastest).toBe('https://rpc1.com');
    expect(cacheManager.getLatencyMap).toHaveBeenCalledWith(chainId);
    expect(cacheManager.getFastestRpc).toHaveBeenCalledWith(chainId);
  });

   it('should return null for next fastest if cache has no latency map', async () => {
    const chainId = 1;
     // Pre-populate cache without latencyMap
    (cacheManager as any).cache[chainId] = {
        fastestRpc: 'https://rpc2.com',
        latencyMap: null, // Explicitly null or undefined
        lastTested: Date.now()
    };
     const nextFastest = await rpcSelector.findNextFastestRpc(chainId);
     expect(nextFastest).toBeNull();
   });

   it('should return null for next fastest if only one RPC in latency map', async () => {
    const chainId = 1;
     (cacheManager as any).cache[chainId] = {
        fastestRpc: 'https://rpc2.com',
        latencyMap: { 'https://rpc2.com': 50 },
        lastTested: Date.now()
    };
     const nextFastest = await rpcSelector.findNextFastestRpc(chainId);
     expect(nextFastest).toBeNull();
   });

});
