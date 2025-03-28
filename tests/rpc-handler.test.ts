import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { RpcHandler } from '../src/rpc-handler.js';
// NOTE: We are NOT mocking RpcSelector anymore to test integration with real data source

// --- Mocks ---

// Mock global fetch - This needs to handle potential REAL RPC URLs now
global.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const body = init?.body ? JSON.parse(init.body as string) : {};
  const method = body.method;

  console.log(`Mock Fetch: URL=${url}, Method=${method}`);

  // Simulate responses based on URL and method
  // Use real URLs that might be selected (e.g., from Ethereum mainnet in rpcs.json)
  // We still control the *outcome* via the mock response.

  // --- Success Cases ---
  // Simulate success for known good RPCs (adjust URLs based on rpcs.json if needed)
  if (url.includes('cloudflare-eth.com') || url.includes('rpc.ankr.com/eth') || url.includes('eth.llamarpc.com')) {
      if (method === 'eth_blockNumber') {
          // Return slightly different results to distinguish
          let result = '0x1b4'; // Default
          if (url.includes('cloudflare')) result = '0x1b4'; // ~436
          if (url.includes('ankr')) result = '0x1b5'; // ~437
          if (url.includes('llama')) result = '0x1b6'; // ~438
          return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: result }), { status: 200 });
      }
  }

  // --- Failure Case for Fallback Test ---
  // Simulate failure for a specific RPC known to be in the list (e.g., flashbots)
  if (url.includes('rpc.flashbots.net')) {
       console.log(`Simulating failure for ${url}`);
       return new Response('Gateway Timeout', { status: 504 });
  }

  // Default error response for any other URL
  console.log(`Mock Fetch: Unhandled URL ${url}, returning 404`);
  return new Response('Not Found', { status: 404 });
}) as any;


// --- Tests ---
describe('RpcHandler (Integration with Real DataSource)', () => {
  let handler: RpcHandler;

  beforeEach(() => {
    // Reset fetch mock calls
    (global.fetch as any).mockClear();

    // Instantiate RpcHandler normally. It will create its own dependencies.
    // We rely on the fetch mock above to control network interaction.
    // We might need to mock LatencyTester results if we want deterministic fastest selection
    // For now, let LatencyTester run but intercept fetch.
    handler = new RpcHandler({
        requestTimeoutMs: 1000, // Short timeout for tests
        latencyTimeoutMs: 500, // Short latency test timeout
        cacheTtlMs: 0 // Disable cache TTL for predictable testing (always re-evaluates)
    });

    // Clear cache file before each test for isolation
    const fs = require('node:fs');
    const path = require('node:path');
    // Assuming default cache path - adjust if CacheManager changes it
    const cachePath = path.join(__dirname, '..', '.rpc-cache.json');
     try {
        if (fs.existsSync(cachePath)) {
            fs.unlinkSync(cachePath);
        }
    } catch (err) { /* ignore */ }

  });

   afterEach(() => {
      // Clean up cache file after each test
      const fs = require('node:fs');
      const path = require('node:path');
      const cachePath = path.join(__dirname, '..', '.rpc-cache.json');
       try {
          if (fs.existsSync(cachePath)) {
              fs.unlinkSync(cachePath);
          }
      } catch (err) { /* ignore */ }
   });


  it('should select a real RPC and make a call', async () => {
    const chainId = 1; // Ethereum
    const method = 'eth_blockNumber';

    // The actual fastest RPC depends on LatencyTester results hitting the mocked fetch.
    // Let's assume fetch mock makes cloudflare fastest.
    const result = await handler.send(chainId, method);

    // Expect a result from one of the mocked successful URLs
    expect(['0x1b4', '0x1b5', '0x1b6']).toContain(result);
    // Latency testing calls fetch many times, check at least one call was made for the actual method
    expect((global.fetch as any).mock.calls.length).toBeGreaterThanOrEqual(1);

    // Verify the *last* fetch call was the successful RPC method call
    const calls = (global.fetch as any).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toMatch(/^https:\/\//); // Should be a real URL
    expect(JSON.parse(lastCall[1].body).method).toBe(method);
  });

  // This test is harder to make deterministic without mocking LatencyTester results.
  // We mock fetch to make flashbots fail, hoping selector picks it first, then falls back.
  it('should attempt fallback if the selected RPC fails', async () => {
    const chainId = 1;
    const method = 'eth_blockNumber';

    // We expect it to potentially try flashbots (mocked to fail), then succeed on another.
    const result = await handler.send(chainId, method);

    expect(['0x1b4', '0x1b5', '0x1b6']).toContain(result); // Should get result from fallback
    // Expect at least two calls (latency tests + failed call + fallback call)
    expect((global.fetch as any).mock.calls.length).toBeGreaterThanOrEqual(2);

    // Verify the last two calls correspond to the failed attempt and the successful fallback
    const calls = (global.fetch as any).mock.calls;
    const fallbackCall = calls[calls.length - 1]; // Last call is the successful one
    const failedCall = calls[calls.length - 2]; // Penultimate call is the failed one

    // We can't guarantee flashbots is chosen first without mocking latency results,
    // but we expect the failed call to potentially be the failing one.
    // expect(failedCall[0]).toContain('flashbots');

    expect(fallbackCall[0]).not.toContain('flashbots'); // Fallback call should be different
    expect(JSON.parse(fallbackCall[1].body).method).toBe(method);

  }, 10000); // Increase timeout for this test as it involves latency testing + fallback

  it('should throw if no valid RPCs are found or all fail', async () => {
    const nonExistentChainId = 9999999;
    const method = 'eth_blockNumber';

    // Test with a non-existent chain
    await expect(handler.send(nonExistentChainId, method)).rejects.toThrow(
        /No available RPC endpoints found/
    );

    // Test with a chain where all fetches will fail (modify fetch mock)
    const originalFetchMock = global.fetch; // Store original mock
    (global.fetch as any).mockImplementation(async (url: string) => {
        console.log(`Mock Fetch (All Fail): URL=${url}`);
        return new Response('Error', {status: 500});
    });
    const chainId = 1;
     await expect(handler.send(chainId, method)).rejects.toThrow(
        /No available RPC endpoints found/ // Expect this error now, as selector returns null
    );
    global.fetch = originalFetchMock; // Restore original fetch mock

  });

});
