import { beforeEach, describe, expect, it, mock } from "bun:test";
import { LatencyTester } from "../src/latency-tester.ts";
import PERMIT2_BYTECODE_PREFIX from "../src/permit2-bytecode.ts";

// Mock the global fetch function
global.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const signal = init?.signal;
  const body = init?.body ? JSON.parse(init.body as string) : {};
  const method = body.method;
  const id = body.id;

  // Helper function to create a promise that rejects on abort
  const abortPromise = new Promise<never>((_, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const abortListener = () => {
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", abortListener);
  });

  // Helper function to simulate delay
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    // --- eth_getCode Simulation ---
    if (method === "eth_getCode") {
      if (url.includes("fast-rpc") || url.includes("slow-rpc") || url.includes("syncing-rpc")) {
        await Promise.race([delay(url.includes("fast-rpc") ? 20 : 100), abortPromise]); // Use adjusted delays
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: id, result: PERMIT2_BYTECODE_PREFIX + "abc" }), { status: 200 });
      } else if (url.includes("wrong-bytecode-rpc")) {
        await Promise.race([delay(20), abortPromise]);
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: id, result: "0x12345" }), { status: 200 }); // Incorrect bytecode
      } else if (url.includes("error-rpc")) {
        await Promise.race([delay(10), abortPromise]);
        // Simulate RPC error for getCode
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: id, error: { code: -32002, message: "getCode error" } }), { status: 200 });
      } else if (url.includes("http-error-rpc")) {
        await Promise.race([delay(10), abortPromise]);
        return new Response("Not Found", { status: 404 });
      } else if (url.includes("timeout-rpc")) {
        await Promise.race([delay(1000), abortPromise]); // Will be aborted by test timeout
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: id, result: PERMIT2_BYTECODE_PREFIX + "abc" }), { status: 200 });
      }
    }

    // --- eth_syncing Simulation ---
    if (method === "eth_syncing") {
      if (url.includes("fast-rpc") || url.includes("slow-rpc") || url.includes("wrong-bytecode-rpc")) {
        await Promise.race([delay(url.includes("fast-rpc") ? 20 : 100), abortPromise]);
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: id, result: false }), { status: 200 }); // Synced
      } else if (url.includes("syncing-rpc")) {
        await Promise.race([delay(20), abortPromise]);
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: id, result: { currentBlock: "0x1" } }), { status: 200 }); // Syncing
      } else if (url.includes("error-rpc")) {
        // Allow syncing to succeed even if getCode fails, to test getCode error path
        await Promise.race([delay(10), abortPromise]);
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: id, result: false }), { status: 200 });
      } else if (url.includes("http-error-rpc")) {
        await Promise.race([delay(10), abortPromise]);
        return new Response("Not Found", { status: 404 });
      } else if (url.includes("timeout-rpc")) {
        await Promise.race([delay(1000), abortPromise]); // Will be aborted by test timeout
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: id, result: false }), { status: 200 });
      }
    }

    // Default case for unexpected methods/URLs
    await Promise.race([delay(5), abortPromise]);
    return new Response("Bad Request", { status: 400 });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    console.error("Mock fetch error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}) as any;

describe("LatencyTester", () => {
  let tester: LatencyTester;
  let longTimeoutTester: LatencyTester;

  beforeEach(() => {
    (global.fetch as any).mockClear();
    tester = new LatencyTester(200); // Short timeout for most tests
    longTimeoutTester = new LatencyTester(300); // Adjusted longer timeout
  });

  it("should return latency for successful, synced RPC with correct bytecode", async () => {
    const urls = ["https://fast-rpc.com", "https://slow-rpc.com"];
    const results = await longTimeoutTester.testRpcUrls(urls);

    // Latency is based on the *slowest* of the two concurrent calls
    expect(results["https://fast-rpc.com"]?.status).toBe("ok");
    expect(results["https://fast-rpc.com"]?.latency).toBeGreaterThanOrEqual(20);
    expect(results["https://fast-rpc.com"]?.latency).toBeLessThan(150);
    expect(results["https://slow-rpc.com"]?.status).toBe("ok");
    expect(results["https://slow-rpc.com"]?.latency).toBeGreaterThanOrEqual(100); // Based on 100ms delay in mock
    expect(results["https://slow-rpc.com"]?.latency).toBeLessThan(250);
  });

  it("should return Infinity latency and rpc_error status for RPC errors", async () => {
    const urls = ["https://error-rpc.com"]; // Mock returns error for eth_getCode
    const results = await tester.testRpcUrls(urls);
    expect(results["https://error-rpc.com"]?.latency).toBe(Infinity);
    expect(results["https://error-rpc.com"]?.status).toBe("rpc_error");
    expect(results["https://error-rpc.com"]?.error).toContain("getCode error");
  });

  it("should return Infinity latency and network_error status for HTTP errors", async () => {
    const urls = ["https://http-error-rpc.com"];
    // Override fetch mock for this specific test to simulate direct HTTP error
    (global.fetch as any).mockImplementationOnce(async (input: RequestInfo | URL, init?: RequestInit) => {
      // Simulate HTTP 404 error for the eth_getCode call (or eth_syncing, doesn't matter which fails first)
      return new Response("Not Found", { status: 404 });
    });

    const resultsHttp = await tester.testRpcUrls(urls);
    expect(resultsHttp["https://http-error-rpc.com"]?.latency).toBe(Infinity);
    expect(resultsHttp["https://http-error-rpc.com"]?.status).toBe("http_error"); // _makeRpcCall throws HTTP error
    expect(resultsHttp["https://http-error-rpc.com"]?.error).toContain("HTTP error 404");
  });

  it("should return Infinity latency and timeout status for timed-out requests", async () => {
    const urls = ["https://timeout-rpc.com"];
    const results = await tester.testRpcUrls(urls); // Uses 200ms timeout
    expect(results["https://timeout-rpc.com"]?.latency).toBe(Infinity);
    expect(results["https://timeout-rpc.com"]?.status).toBe("timeout");
  });

  it("should return measured latency and syncing status if node is syncing", async () => {
    const urls = ["https://syncing-rpc.com"];
    const results = await tester.testRpcUrls(urls);
    // Syncing nodes now return their actual latency, not Infinity
    expect(results["https://syncing-rpc.com"]?.latency).toBeGreaterThan(0);
    expect(results["https://syncing-rpc.com"]?.latency).toBeLessThan(Infinity);
    expect(results["https://syncing-rpc.com"]?.status).toBe("syncing");
  });

  // Restore bytecode test
  it("should return measured latency and wrong_bytecode status if bytecode is incorrect", async () => {
    const urls = ["https://wrong-bytecode-rpc.com"];
    const results = await tester.testRpcUrls(urls);
    // Nodes with wrong bytecode now return their actual latency, not Infinity
    expect(results["https://wrong-bytecode-rpc.com"]?.latency).toBeGreaterThan(0);
    expect(results["https://wrong-bytecode-rpc.com"]?.latency).toBeLessThan(Infinity);
    expect(results["https://wrong-bytecode-rpc.com"]?.status).toBe("wrong_bytecode");
  });

  it("should handle an empty list of URLs", async () => {
    const results = await tester.testRpcUrls([]);
    expect(results).toEqual({});
  });

  // Concurrency test
  it("should test multiple URLs concurrently", async () => {
    const urls = [
      "https://fast-rpc.com", // ~20ms -> ok
      "https://error-rpc.com", // ~10ms -> rpc_error
      "https://slow-rpc.com", // ~100ms -> ok
      "https://syncing-rpc.com", // ~20ms -> syncing
      "https://wrong-bytecode-rpc.com", // ~20ms -> wrong_bytecode
      "https://timeout-rpc.com", // >200ms -> timeout (using default tester)
    ];
    const startTime = Date.now();
    const results = await tester.testRpcUrls(urls); // Uses 200ms timeout tester
    const duration = Date.now() - startTime;

    // Check statuses
    expect(results["https://fast-rpc.com"]?.status).toBe("ok");
    expect(results["https://error-rpc.com"]?.status).toBe("rpc_error");
    expect(results["https://slow-rpc.com"]?.status).toBe("ok");
    expect(results["https://syncing-rpc.com"]?.status).toBe("syncing");
    expect(results["https://wrong-bytecode-rpc.com"]?.status).toBe("wrong_bytecode"); // Check restored test
    expect(results["https://timeout-rpc.com"]?.status).toBe("timeout");

    // Duration check: slowest successful is slow-rpc (~100ms), timeout is 200ms
    expect(duration).toBeGreaterThanOrEqual(200);
    expect(duration).toBeLessThan(400); // Allow buffer
  });
});
