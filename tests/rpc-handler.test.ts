import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { RpcHandler } from '../src/rpc-handler.js';
import { RpcSelector } from '../src/rpc-selector.js';
// We don't need to mock the lower-level components directly,
// as we can control RpcHandler by mocking RpcSelector and fetch.

// --- Mocks ---

// Mock RpcSelector
let mockRpcSelectorInstance: RpcSelector;
mock.module('../src/rpc-selector.js', () => ({
  RpcSelector: class {
    findFastestRpc = mock(async (chainId: number): Promise<string | null> => null); // Default mock implementation
    findNextFastestRpc = mock(async (chainId: number): Promise<string | null> => null); // Default mock implementation
    constructor(...args: any[]) {
      // Store the instance reference if needed, or just mock methods
      mockRpcSelectorInstance = this as any;
    }
  }
}));

// Mock global fetch (similar to latency-tester tests, but focused on RpcHandler calls)
global.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const body = init?.body ? JSON.parse(init.body as string) : {};
  const method = body.method;

  console.log(`Mock Fetch: URL=${url}, Method=${method}`); // Log mock fetch calls

  // Simulate responses based on URL and method
  if (url.includes('fastest-rpc.com')) {
    if (method === 'eth_blockNumber') {
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: '0x123' }), { status: 200 });
    }
  } else if (url.includes('fallback-rpc.com')) {
     if (method === 'eth_blockNumber') {
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: '0x456' }), { status: 200 });
    }
  } else if (url.includes('error-rpc.com')) {
      // Simulate an error for fallback testing
      return new Response('Internal Server Error', { status: 500 });
  }

  // Default error response
  return new Response('Not Found', { status: 404 });
}) as any;


// --- Tests ---
describe('RpcHandler', () => {
  let handler: RpcHandler;
  let selectorMock: RpcSelector; // To access mocked methods

  beforeEach(() => {
    // Reset mocks
    (global.fetch as any).mockClear();
    // We need to get the mocked instance of RpcSelector created by the RpcHandler constructor
    handler = new RpcHandler({ requestTimeoutMs: 500 }); // Use short timeout for tests
    selectorMock = mockRpcSelectorInstance; // Get the instance created within RpcHandler

    // Clear selector mocks specifically
     if (selectorMock) {
        (selectorMock.findFastestRpc as any).mockClear();
        (selectorMock.findNextFastestRpc as any).mockClear();
     } else {
        console.warn("Selector mock instance not found in beforeEach");
     }
  });

  it('should call the fastest RPC returned by selector', async () => {
    const chainId = 1;
    const method = 'eth_blockNumber';
    const expectedResult = '0x123';
    const fastestRpc = 'https://fastest-rpc.com';

    // Setup selector mock
    (selectorMock.findFastestRpc as any).mockResolvedValue(fastestRpc);

    const result = await handler.send(chainId, method);

    expect(result).toBe(expectedResult);
    expect(selectorMock.findFastestRpc).toHaveBeenCalledWith(chainId);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    // Check fetch was called with the correct URL
    const fetchCall = (global.fetch as any).mock.calls[0];
    expect(fetchCall[0]).toBe(fastestRpc);
    expect(JSON.parse(fetchCall[1].body).method).toBe(method);
    expect(selectorMock.findNextFastestRpc).not.toHaveBeenCalled();
  });

  it('should fallback to the next fastest RPC if the first fails', async () => {
    const chainId = 1;
    const method = 'eth_blockNumber';
    const expectedResult = '0x456'; // Result from fallback
    const errorRpc = 'https://error-rpc.com'; // This one will fail
    const fallbackRpc = 'https://fallback-rpc.com'; // This one should succeed

    // Setup selector mock
    (selectorMock.findFastestRpc as any).mockResolvedValue(errorRpc);
    (selectorMock.findNextFastestRpc as any).mockResolvedValue(fallbackRpc);

    const result = await handler.send(chainId, method);

    expect(result).toBe(expectedResult);
    expect(selectorMock.findFastestRpc).toHaveBeenCalledWith(chainId);
    expect(selectorMock.findNextFastestRpc).toHaveBeenCalledWith(chainId);
    expect(global.fetch).toHaveBeenCalledTimes(2); // Called twice (initial + fallback)

    // Check fetch calls
    const firstFetchCall = (global.fetch as any).mock.calls[0];
    expect(firstFetchCall[0]).toBe(errorRpc);
    expect(JSON.parse(firstFetchCall[1].body).method).toBe(method);

    const secondFetchCall = (global.fetch as any).mock.calls[1];
    expect(secondFetchCall[0]).toBe(fallbackRpc);
    expect(JSON.parse(secondFetchCall[1].body).method).toBe(method);
  });

  it('should throw if no RPCs are available', async () => {
    const chainId = 1;
    const method = 'eth_blockNumber';

    // Setup selector mock
    (selectorMock.findFastestRpc as any).mockResolvedValue(null);

    await expect(handler.send(chainId, method)).rejects.toThrow(
        `No available RPC endpoints found for chainId ${chainId}.`
    );
    expect(selectorMock.findFastestRpc).toHaveBeenCalledWith(chainId);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should throw if both primary and fallback RPCs fail', async () => {
     const chainId = 1;
    const method = 'eth_blockNumber';
    const errorRpc1 = 'https://error-rpc.com/1';
    const errorRpc2 = 'https://error-rpc.com/2'; // Both will fail

    // Setup selector mock
    (selectorMock.findFastestRpc as any).mockResolvedValue(errorRpc1);
    (selectorMock.findNextFastestRpc as any).mockResolvedValue(errorRpc2);

    await expect(handler.send(chainId, method)).rejects.toThrow(
        /RPC call failed for chainId 1 on primary and fallback endpoints/
    );
    expect(selectorMock.findFastestRpc).toHaveBeenCalledWith(chainId);
    expect(selectorMock.findNextFastestRpc).toHaveBeenCalledWith(chainId);
    expect(global.fetch).toHaveBeenCalledTimes(2); // Called twice
  });

   it('should throw if primary fails and no fallback is available', async () => {
     const chainId = 1;
    const method = 'eth_blockNumber';
    const errorRpc = 'https://error-rpc.com';

    // Setup selector mock
    (selectorMock.findFastestRpc as any).mockResolvedValue(errorRpc);
    (selectorMock.findNextFastestRpc as any).mockResolvedValue(null); // No fallback

    await expect(handler.send(chainId, method)).rejects.toThrow(
        /RPC call failed for chainId 1 and no fallback available/
    );
    expect(selectorMock.findFastestRpc).toHaveBeenCalledWith(chainId);
    expect(selectorMock.findNextFastestRpc).toHaveBeenCalledWith(chainId);
    expect(global.fetch).toHaveBeenCalledTimes(1); // Only called once
  });

});
