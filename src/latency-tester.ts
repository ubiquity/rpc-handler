import PERMIT2_BYTECODE_PREFIX from './permit2-bytecode.js';

// --- Interfaces ---
interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any[];
  id: number | string;
}

interface JsonRpcError {
    code: number;
    message: string;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: JsonRpcError;
}

type EthSyncingResult = false | { /* ... */ }; // Keep simple for type check

export type LatencyTestStatus = 'ok' | 'syncing' | 'wrong_bytecode' | 'timeout' | 'http_error' | 'rpc_error' | 'network_error';

export interface LatencyTestResult {
    url: string;
    latency: number; // Infinity indicates failure
    status: LatencyTestStatus;
    error?: string; // Optional error message string
}

// --- Constants ---
const DEFAULT_TIMEOUT_MS = 5000;
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

// --- Class ---
export class LatencyTester {
  private timeoutMs: number;

  constructor(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
  }

  private async _makeRpcCall(url: string, method: string, params: any[]): Promise<JsonRpcResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    const requestBody: JsonRpcRequest = {
      jsonrpc: '2.0', method, params, id: `latency-test-${method}-${Date.now()}`,
    };
    let response: Response;
    try {
       response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody), signal: controller.signal,
      });
    } catch (error: any) {
        clearTimeout(timeoutId);
        throw error; // Re-throw network/abort errors
    }
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status} ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * Tests latency, sync status, and Permit2 bytecode for a single RPC URL.
   * Returns a detailed result object.
   */
  private async testSingleRpc(url: string): Promise<LatencyTestResult> {
    const startTime = Date.now();
    let getCodeResponse: JsonRpcResponse | null = null;
    let syncingResponse: JsonRpcResponse | null = null;
    let error: any = null;
    let status: LatencyTestStatus = 'network_error'; // Default to network error

    try {
      [getCodeResponse, syncingResponse] = await Promise.all([
        this._makeRpcCall(url, 'eth_getCode', [PERMIT2_ADDRESS, 'latest']),
        this._makeRpcCall(url, 'eth_syncing', [])
      ]);
    } catch (err: any) {
      error = err; // Capture error from Promise.all
      if (err.name === 'AbortError') {
          status = 'timeout';
      } else {
          status = 'network_error'; // Includes connection refused, DNS errors etc.
      }
      console.warn(`Latency test failed for ${url}: ${status} - ${err.message}`);
      return { url, latency: Infinity, status, error: err.message };
    }

    const latency = Date.now() - startTime;

    // Check for HTTP errors (handled by _makeRpcCall throwing) - status already set above
    // Check for RPC errors
    if (getCodeResponse?.error) {
      status = 'rpc_error';
      const errMsg = `eth_getCode RPC error ${getCodeResponse.error.code} - ${getCodeResponse.error.message}`;
      console.warn(`Latency test failed for ${url}: ${errMsg}`);
      return { url, latency: Infinity, status, error: errMsg };
    }
    if (syncingResponse?.error) {
       status = 'rpc_error';
       const errMsg = `eth_syncing RPC error ${syncingResponse.error.code} - ${syncingResponse.error.message}`;
       console.warn(`Latency test failed for ${url}: ${errMsg}`);
       return { url, latency: Infinity, status, error: errMsg };
    }

    // Check eth_getCode result
    if (typeof getCodeResponse?.result !== 'string' || !getCodeResponse.result.startsWith(PERMIT2_BYTECODE_PREFIX)) {
       status = 'wrong_bytecode';
       const errMsg = `Invalid or incorrect Permit2 bytecode returned.`;
       console.warn(`Latency test failed for ${url}: ${errMsg}`);
       return { url, latency: Infinity, status, error: errMsg };
    }

    // Check eth_syncing result
    if (syncingResponse?.result !== false) {
        status = 'syncing';
        const errMsg = `Node is not synced (eth_syncing returned ${JSON.stringify(syncingResponse?.result)})`;
        console.warn(`Latency test failed for ${url}: ${errMsg}`);
        return { url, latency: Infinity, status, error: errMsg };
    }

    // All checks passed
    status = 'ok';
    return { url, latency, status };
  }

  /**
   * Tests a list of RPC URLs concurrently and returns a map of URL to detailed results.
   */
  async testRpcUrls(urls: string[]): Promise<Record<string, LatencyTestResult>> {
    if (!urls || urls.length === 0) return {};
    console.log(`Starting latency tests for ${urls.length} RPC URLs (incl. sync & bytecode check)...`);

    const results = await Promise.allSettled(urls.map(url => this.testSingleRpc(url)));
    const resultMap: Record<string, LatencyTestResult> = {};

    results.forEach((result, index) => {
      const url = urls[index];
      if (url === undefined) {
        console.error(`Error: url at index ${index} is undefined during latency test processing.`);
        return;
      }
      if (result.status === 'fulfilled') {
        resultMap[url] = result.value; // Contains the detailed LatencyTestResult
      } else {
        // Should ideally not happen as testSingleRpc catches errors
        console.error(`Unexpected rejection during latency test promise for ${url}:`, result.reason);
        resultMap[url] = { url, latency: Infinity, status: 'network_error', error: result.reason?.message || 'Unknown rejection' };
      }
    });

    console.log(`Latency tests completed.`);
    return resultMap;
  }
}
