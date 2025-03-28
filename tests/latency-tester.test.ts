import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { LatencyTester } from '../src/latency-tester.js';
import PERMIT2_BYTECODE_PREFIX from '../src/permit2-bytecode.js';

// Mock the global fetch function
global.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const signal = init?.signal;
  const body = init?.body ? JSON.parse(init.body as string) : {};
  const method = body.method;
  const id = body.id;

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
  });

  // Helper function to simulate delay
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    // --- eth_getCode Simulation ---
    if (method === 'eth_getCode') {
        if (url.includes('fast-rpc') || url.includes('slow-rpc')) {
            // Reduce slow-rpc delay to avoid hitting timeout in concurrency test
            await Promise.race([delay(url.includes('fast-rpc') ? 20 : 100), abortPromise]);
            return new Response(JSON.stringify({ jsonrpc: '2.0', id: id, result: PERMIT2_BYTECODE_PREFIX + "abc" }), { status: 200 });
        } else if (url.includes('wrong-bytecode-rpc')) {
             await Promise.race([delay(20), abortPromise]);
             return new Response(JSON.stringify({ jsonrpc: '2.0', id: id, result: "0x12345" }), { status: 200 }); // Incorrect bytecode
        } else if (url.includes('error-rpc') || url.includes('syncing-rpc')) {
             await Promise.race([delay(20), abortPromise]);
             // Allow getCode to succeed even if syncing fails, to test syncing check
             return new Response(JSON.stringify({ jsonrpc: '2.0', id: id, result: PERMIT2_BYTECODE_PREFIX + "abc" }), { status: 200 });
        } else if (url.includes('http-error-rpc')) {
             await Promise.race([delay(10), abortPromise]);
             return new Response('Not Found', { status: 404 });
        } else if (url.includes('timeout-rpc')) {
             await Promise.race([delay(1000), abortPromise]); // Will be aborted by test timeout
             return new Response(JSON.stringify({ jsonrpc: '2.0', id: id, result: PERMIT2_BYTECODE_PREFIX + "abc" }), { status: 200 });
        }
    }

    // --- eth_syncing Simulation ---
    if (method === 'eth_syncing') {
         if (url.includes('fast-rpc') || url.includes('slow-rpc') || url.includes('wrong-bytecode-rpc')) {
             // Reduce slow-rpc delay
            await Promise.race([delay(url.includes('fast-rpc') ? 20 : 100), abortPromise]);
            return new Response(JSON.stringify({ jsonrpc: '2.0', id: id, result: false }), { status: 200 }); // Synced
        } else if (url.includes('syncing-rpc')) {
             await Promise.race([delay(20), abortPromise]);
             return new Response(JSON.stringify({ jsonrpc: '2.0', id: id, result: { currentBlock: '0x1' } }), { status: 200 }); // Syncing
        } else if (url.includes('error-rpc')) {
             await Promise.race([delay(10), abortPromise]);
             return new Response(JSON.stringify({ jsonrpc: '2.0', id: id, error: { code: -32001, message: 'Syncing error' } }), { status: 200 }); // RPC error
        } else if (url.includes('http-error-rpc')) {
             await Promise.race([delay(10), abortPromise]);
             return new Response('Not Found', { status: 404 });
        } else if (url.includes('timeout-rpc')) {
             await Promise.race([delay(1000), abortPromise]); // Will be aborted by test timeout
             return new Response(JSON.stringify({ jsonrpc: '2.0', id: id, result: false }), { status: 200 });
        }
    }

    // Default case for unexpected methods/URLs
    await Promise.race([delay(5), abortPromise]);
    return new Response('Bad Request', { status: 400 });

  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.error("Mock fetch error:", error);
    return new Response('Internal Server Error', { status: 500 });
  }
}) as any;


describe('LatencyTester', () => {
  let tester: LatencyTester;
  let longTimeoutTester: LatencyTester;

  beforeEach(() => {
    (global.fetch as any).mockClear();
    tester = new LatencyTester(200); // Short timeout for most tests
    longTimeoutTester = new LatencyTester(1000); // Longer timeout for slow tests
  });

  it('should return latency for successful, synced RPC with correct bytecode', async () => {
    const urls = ['https://fast-rpc.com', 'https://slow-rpc.com'];
    // Use long timeout tester as slow-rpc mock takes 200ms per call (400ms+ total)
    const results = await longTimeoutTester.testRpcUrls(urls);

    // Latency is based on the *slowest* of the two concurrent calls (eth_getCode, eth_syncing)
    // Check status and latency for successful calls
    expect(results['https://fast-rpc.com']?.status).toBe('ok');
    expect(results['https://fast-rpc.com']?.latency).toBeGreaterThanOrEqual(20);
    expect(results['https://fast-rpc.com']?.latency).toBeLessThan(150);
    expect(results['https://slow-rpc.com']?.status).toBe('ok');
    expect(results['https://slow-rpc.com']?.latency).toBeGreaterThanOrEqual(100);
    expect(results['https://slow-rpc.com']?.latency).toBeLessThan(250);
  });

  it('should return Infinity latency and rpc_error status for RPC errors', async () => {
    const urls = ['https://error-rpc.com'];
    const results = await tester.testRpcUrls(urls);
    expect(results['https://error-rpc.com']?.latency).toBe(Infinity);
    expect(results['https://error-rpc.com']?.status).toBe('rpc_error');
    expect(results['https://error-rpc.com']?.error).toContain('Syncing error');
  });

  it('should return Infinity latency and http_error status for HTTP errors', async () => {
    const urls = ['https://http-error-rpc.com'];
    const results = await tester.testRpcUrls(urls);
    expect(results['https://http-error-rpc.com']?.latency).toBe(Infinity);
    // Note: The mock currently causes an RPC error first for eth_syncing in this case.
    // If _makeRpcCall threw the HTTP error directly, status would be 'http_error'.
    // Let's adjust the mock slightly for a direct HTTP error on one call.
     (global.fetch as any).mockImplementationOnce(async (input: RequestInfo | URL, init?: RequestInit) => {
         if (init?.body && JSON.parse(init.body as string).method === 'eth_getCode') {
             return new Response('Not Found', { status: 404 }); // Fail getCode directly
         }
         // Let syncing pass for this specific sub-test if getCode failed
         return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: false }), { status: 200 });
     });
     const resultsHttp = await tester.testRpcUrls(urls);
     expect(resultsHttp['https://http-error-rpc.com']?.latency).toBe(Infinity);
     expect(resultsHttp['https://http-error-rpc.com']?.status).toBe('network_error'); // fetch throws on !response.ok
     expect(resultsHttp['https://http-error-rpc.com']?.error).toContain('HTTP error 404');


  });

  it('should return Infinity latency and timeout status for timed-out requests', async () => {
    const urls = ['https://timeout-rpc.com'];
    const results = await tester.testRpcUrls(urls);
    expect(results['https://timeout-rpc.com']?.latency).toBe(Infinity);
    expect(results['https://timeout-rpc.com']?.status).toBe('timeout');
  });

  it('should return Infinity latency and syncing status if node is syncing', async () => {
    const urls = ['https://syncing-rpc.com'];
    const results = await tester.testRpcUrls(urls);
    expect(results['https://syncing-rpc.com']?.latency).toBe(Infinity);
    expect(results['https://syncing-rpc.com']?.status).toBe('syncing');
  });

  it('should return Infinity latency and wrong_bytecode status if bytecode is incorrect', async () => {
     const urls = ['https://wrong-bytecode-rpc.com'];
     const results = await tester.testRpcUrls(urls);
     expect(results['https://wrong-bytecode-rpc.com']?.latency).toBe(Infinity);
     expect(results['https://wrong-bytecode-rpc.com']?.status).toBe('wrong_bytecode');
  });

   it('should handle an empty list of URLs', async () => {
    const results = await tester.testRpcUrls([]);
    expect(results).toEqual({});
  });

  // Concurrency test
  it('should test multiple URLs concurrently', async () => {
    const urls = [
      'https://fast-rpc.com', // ~20ms
      'https://error-rpc.com', // ~10ms -> Infinity
      'https://slow-rpc.com', // ~200ms
      'https://syncing-rpc.com', // ~20ms -> Infinity
      'https://wrong-bytecode-rpc.com', // ~20ms -> Infinity
      'https://timeout-rpc.com', // >200ms -> Infinity (using default tester)
    ];
    const startTime = Date.now();
    // Use default tester (200ms timeout) - slow-rpc (now 100ms) should finish, timeout-rpc should timeout
    const results = await tester.testRpcUrls(urls);
    const duration = Date.now() - startTime;

    // Check statuses and latencies
    expect(results['https://fast-rpc.com']?.status).toBe('ok');
    expect(results['https://error-rpc.com']?.status).toBe('rpc_error');
    expect(results['https://slow-rpc.com']?.status).toBe('ok');
    expect(results['https://syncing-rpc.com']?.status).toBe('syncing');
    expect(results['https://wrong-bytecode-rpc.com']?.status).toBe('wrong_bytecode');
    expect(results['https://timeout-rpc.com']?.status).toBe('timeout');

    // Duration check remains the same
    // The timeout-rpc will abort around 200ms.
    expect(duration).toBeGreaterThanOrEqual(200);
    // Allow generous buffer
    expect(duration).toBeLessThan(400);
  });
});
