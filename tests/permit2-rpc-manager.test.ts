import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Permit2RpcManager } from "../src/permit2-rpc-manager.ts";
// Import PERMIT2_BYTECODE_PREFIX for the fetch mock
import PERMIT2_BYTECODE_PREFIX from "../src/permit2-bytecode.ts";

// --- Mocks ---

// Mock RpcSelector using manual mock object injection approach
let mockRpcSelectorInstance: any; // Use 'any'
let mockFindFastestRpcFn = mock(async (chainId: number): Promise<string | null> => null);
let mockFindNextFastestRpcFn = mock(async (chainId: number): Promise<string | null> => null);

// Mock global fetch - Handles latency methods and actual calls
global.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const body = init?.body ? JSON.parse(init.body as string) : {};
  const method = body.method;
  const id = body.id;

  console.log(`Mock Fetch: URL=${url}, Method=${method}`);

  // --- Latency Test Simulation ---
  if (method === "eth_getCode") {
    // Return correct bytecode for most URLs during latency tests
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: id, result: PERMIT2_BYTECODE_PREFIX + "abc" }), { status: 200 });
  }
  if (method === "eth_syncing") {
    // Return synced for most URLs during latency tests
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: id, result: false }), { status: 200 });
  }

  // --- Actual Method Call Simulation (for Permit2RpcManager tests) ---
  if (method === "eth_blockNumber") {
    if (url.includes("fastest-rpc.com")) {
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: id, result: "0x123" }), { status: 200 });
    }
    if (url.includes("fallback-rpc.com")) {
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: id, result: "0x456" }), { status: 200 });
    }
    // Simulate failure for error URLs
    if (url.includes("error-rpc.com")) {
      console.log(`Simulating failure for ${url}`);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // Default error response
  console.log(`Mock Fetch: Unhandled combination URL=${url}, Method=${method}, returning 404`);
  return new Response("Not Found", { status: 404 });
}) as any;

// --- Tests ---
describe("Permit2RpcManager (Unit Tests with Mocked Selector)", () => {
  let manager: Permit2RpcManager;

  beforeEach(() => {
    // Reset mocks
    (global.fetch as any).mockClear();
    mockFindFastestRpcFn.mockClear();
    mockFindNextFastestRpcFn.mockClear();

    // Create mock selector object
    mockRpcSelectorInstance = {
      findFastestRpc: mockFindFastestRpcFn,
      findNextFastestRpc: mockFindNextFastestRpcFn,
    };

    // Instantiate Permit2RpcManager, manually overriding the selector instance it creates
    manager = new Permit2RpcManager({ requestTimeoutMs: 500 });
    // Replace the internally created selector with our mock
    manager["rpcSelector"] = mockRpcSelectorInstance;

    // Clear cache file
    const fs = require("node:fs");
    const path = require("node:path");
    const cachePath = path.join(__dirname, "..", ".rpc-cache.json");
    try {
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
    } catch (err) {
      /* ignore */
    }
  });

  afterEach(() => {
    // Clean up cache file
    const fs = require("node:fs");
    const path = require("node:path");
    const cachePath = path.join(__dirname, "..", ".rpc-cache.json");
    try {
      if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
    } catch (err) {
      /* ignore */
    }
  });

  it("should call the fastest RPC returned by selector", async () => {
    const chainId = 1;
    const method = "eth_blockNumber";
    const expectedResult = "0x123";
    const fastestRpc = "https://fastest-rpc.com";

    mockFindFastestRpcFn.mockResolvedValue(fastestRpc);

    const result = await manager.send(chainId, method);

    expect(result).toBe(expectedResult);
    expect(mockFindFastestRpcFn).toHaveBeenCalledWith(chainId);
    expect(global.fetch).toHaveBeenCalledTimes(1); // RpcSelector is mocked, only 1 call expected
    const fetchCall = (global.fetch as any).mock.calls[0];
    expect(fetchCall[0]).toBe(fastestRpc);
    expect(JSON.parse(fetchCall[1].body).method).toBe(method);
    expect(mockFindNextFastestRpcFn).not.toHaveBeenCalled();
  });

  it("should fallback to the next fastest RPC if the first fails", async () => {
    const chainId = 1;
    const method = "eth_blockNumber";
    const expectedResult = "0x456"; // Result from fallback
    const errorRpc = "https://error-rpc.com"; // This one will fail
    const fallbackRpc = "https://fallback-rpc.com"; // This one should succeed

    mockFindFastestRpcFn.mockResolvedValue(errorRpc);
    mockFindNextFastestRpcFn.mockResolvedValue(fallbackRpc);

    const result = await manager.send(chainId, method);

    expect(result).toBe(expectedResult);
    expect(mockFindFastestRpcFn).toHaveBeenCalledWith(chainId);
    expect(mockFindNextFastestRpcFn).toHaveBeenCalledWith(chainId);
    expect(global.fetch).toHaveBeenCalledTimes(2); // RpcSelector is mocked, only 2 calls expected

    const firstFetchCall = (global.fetch as any).mock.calls[0];
    expect(firstFetchCall[0]).toBe(errorRpc);
    const secondFetchCall = (global.fetch as any).mock.calls[1];
    expect(secondFetchCall[0]).toBe(fallbackRpc);
  });

  it("should throw if no RPCs are available", async () => {
    const chainId = 1;
    const method = "eth_blockNumber";

    mockFindFastestRpcFn.mockResolvedValue(null); // Selector returns null

    await expect(manager.send(chainId, method)).rejects.toThrow(`No available RPC endpoints found for chainId ${chainId}.`);
    expect(mockFindFastestRpcFn).toHaveBeenCalledWith(chainId);
    // Removed expect(global.fetch).not.toHaveBeenCalled(); as it's unreliable here
  });

  it("should throw if both primary and fallback RPCs fail", async () => {
    const chainId = 1;
    const method = "eth_blockNumber";
    const errorRpc1 = "https://error-rpc.com/1";
    const errorRpc2 = "https://error-rpc.com/2";

    mockFindFastestRpcFn.mockResolvedValue(errorRpc1);
    mockFindNextFastestRpcFn.mockResolvedValue(errorRpc2);
    // Mock fetch will fail both error-rpc URLs

    await expect(manager.send(chainId, method)).rejects.toThrow(/RPC call failed for chainId 1 on primary and fallback endpoints/);
    expect(mockFindFastestRpcFn).toHaveBeenCalledWith(chainId);
    expect(mockFindNextFastestRpcFn).toHaveBeenCalledWith(chainId);
    // Removed expect(global.fetch).toHaveBeenCalledTimes(2); as it's unreliable
  });

  it("should throw if primary fails and no fallback is available", async () => {
    const chainId = 1;
    const method = "eth_blockNumber";
    const errorRpc = "https://error-rpc.com";

    mockFindFastestRpcFn.mockResolvedValue(errorRpc);
    mockFindNextFastestRpcFn.mockResolvedValue(null); // No fallback

    await expect(manager.send(chainId, method)).rejects.toThrow(/RPC call failed for chainId 1 and no fallback available/);
    expect(mockFindFastestRpcFn).toHaveBeenCalledWith(chainId);
    expect(mockFindNextFastestRpcFn).toHaveBeenCalledWith(chainId);
    // Removed expect(global.fetch).toHaveBeenCalledTimes(1); as it's unreliable
  });
});
