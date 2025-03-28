import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { LatencyTester } from '../src/latency-tester.js'; // Adjust path as needed

// Mock the global fetch function
global.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const signal = init?.signal;

  // Helper function to create a promise that rejects on abort
  const abortPromise = new Promise<never>((_, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const abortListener = () => {
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', abortListener);
    // No cleanup needed here as the promise resolves/rejects only once
  });

  // Helper function to simulate delay
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    // Simulate different responses based on URL for testing
    if (url.includes('fast-rpc')) {
      await Promise.race([delay(50), abortPromise]);
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x1' }), { status: 200 });
    } else if (url.includes('slow-rpc')) {
      await Promise.race([delay(500), abortPromise]);
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x1' }), { status: 200 });
    } else if (url.includes('error-rpc')) {
      await Promise.race([delay(10), abortPromise]);
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'Internal error' } }), { status: 200 });
    } else if (url.includes('http-error-rpc')) {
      await Promise.race([delay(10), abortPromise]);
      return new Response('Not Found', { status: 404 });
    } else if (url.includes('timeout-rpc')) {
      // This delay (1000ms) is longer than the test timeout (200ms)
      await Promise.race([delay(1000), abortPromise]);
      // If abortPromise rejects first, this part won't be reached
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x1' }), { status: 200 });
    } else {
      await Promise.race([delay(5), abortPromise]);
      return new Response('Bad Request', { status: 400 });
    }
  } catch (error) {
    // Re-throw AbortError so the testSingleRpc catch block handles it
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.error("Mock fetch error:", error);
    return new Response('Internal Server Error', { status: 500 });
  }
}) as any; // Use 'as any' to bypass static property type checks like 'preconnect'


describe('LatencyTester', () => {
  let tester: LatencyTester;

  beforeEach(() => {
    (global.fetch as any).mockClear();
    // Use a short timeout for testing timeouts
    tester = new LatencyTester(200); // 200ms timeout for tests
  });

  it('should return latency for successful RPC calls', async () => {
    // Use a longer timeout for this test to allow slow-rpc to complete
    const longTimeoutTester = new LatencyTester(1000);
    const urls = ['https://fast-rpc.com', 'https://slow-rpc.com'];
    const results = await longTimeoutTester.testRpcUrls(urls);

    expect(results['https://fast-rpc.com']).toBeGreaterThanOrEqual(50);
    expect(results['https://fast-rpc.com']).toBeLessThan(150);
    expect(results['https://slow-rpc.com']).toBeGreaterThanOrEqual(500);
    expect(results['https://slow-rpc.com']).toBeLessThan(600);
  });

  it('should return Infinity for RPC errors', async () => {
    const urls = ['https://error-rpc.com'];
    const results = await tester.testRpcUrls(urls);
    expect(results['https://error-rpc.com']).toBe(Infinity);
  });

  it('should return Infinity for HTTP errors', async () => {
    const urls = ['https://http-error-rpc.com'];
    const results = await tester.testRpcUrls(urls);
    expect(results['https://http-error-rpc.com']).toBe(Infinity);
  });

  it('should return Infinity for timed-out requests', async () => {
    const urls = ['https://timeout-rpc.com'];
    const results = await tester.testRpcUrls(urls);
    expect(results['https://timeout-rpc.com']).toBe(Infinity);
  });

   it('should handle an empty list of URLs', async () => {
    const results = await tester.testRpcUrls([]);
    expect(results).toEqual({});
  });

  it('should test multiple URLs concurrently', async () => {
    const urls = [
      'https://fast-rpc.com',
      'https://error-rpc.com',
      'https://slow-rpc.com',
      'https://timeout-rpc.com', // This will still timeout based on the *mock's* delay vs the tester's timeout
    ];
    // Use a longer timeout for this test to allow slow-rpc to complete
    const longTimeoutTester = new LatencyTester(1000);
    const startTime = Date.now();
    const results = await longTimeoutTester.testRpcUrls(urls);
    const duration = Date.now() - startTime;

    expect(results['https://fast-rpc.com']).toBeLessThan(Infinity);
    expect(results['https://error-rpc.com']).toBe(Infinity);
    expect(results['https://slow-rpc.com']).toBeLessThan(Infinity);
    expect(results['https://timeout-rpc.com']).toBe(Infinity);

    // Check concurrency: duration should be ~longest running promise (1000ms timeout) + buffer
    expect(duration).toBeGreaterThanOrEqual(1000);
    expect(duration).toBeLessThan(1100); // Allow buffer for overhead
  });
});
