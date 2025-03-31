import PERMIT2_BYTECODE_PREFIX from "./permit2-bytecode.ts";

// --- Interfaces ---
interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any[];
  id: number | string;
}

interface JsonRpcError {
  code: number;
  message: string;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: any;
  error?: JsonRpcError;
}

type EthSyncingResult =
  | false
  | {
      /* ... */
    }; // Keep simple for type check

// Restore 'wrong_bytecode' status
type LatencyTestStatus = "ok" | "syncing" | "wrong_bytecode" | "timeout" | "http_error" | "rpc_error" | "network_error";

export interface LatencyTestResult {
  url: string;
  latency: number; // Infinity indicates failure
  status: LatencyTestStatus;
  error?: string; // Optional error message string
}

// Define a logger type (can be shared or defined per file)
type LoggerFn = (level: "debug" | "info" | "warn" | "error", message: string, ...optionalParams: any[]) => void;

// --- Constants ---
const DEFAULT_TIMEOUT_MS = 5000;
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3"; // Restore address

// --- Class ---
export class LatencyTester {
  private timeoutMs: number;
  private log: LoggerFn;

  constructor(timeoutMs: number = DEFAULT_TIMEOUT_MS, logger?: LoggerFn) {
    this.timeoutMs = timeoutMs;
    // Use provided logger or a no-op function if none is given
    this.log = logger || (() => {});
  }

  private async _makeRpcCall(url: string, method: string, params: any[]): Promise<JsonRpcResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    const requestBody: JsonRpcRequest = {
      jsonrpc: "2.0",
      method,
      params,
      id: `latency-test-${method}-${Date.now()}`,
    };
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error; // Re-throw network/abort errors
    }
    clearTimeout(timeoutId);
    if (!response.ok) {
      // Include status text in the error message
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
    let getCodeResponse: JsonRpcResponse | null = null; // Restore getCode response variable
    let syncingResponse: JsonRpcResponse | null = null;
    let error: any = null;
    let status: LatencyTestStatus = "network_error"; // Default to network error

    try {
      // Restore concurrent calls
      [getCodeResponse, syncingResponse] = await Promise.all([
        this._makeRpcCall(url, "eth_getCode", [PERMIT2_ADDRESS, "latest"]),
        this._makeRpcCall(url, "eth_syncing", []),
      ]);
    } catch (err: any) {
      error = err; // Capture error from Promise.all
      if (err.name === "AbortError") {
        status = "timeout";
      } else {
        // Distinguish HTTP errors caught by _makeRpcCall
        if (err.message.startsWith("HTTP error")) {
          status = "http_error";
        } else {
          status = "network_error"; // Includes CORS errors from fetch
        }
      }
      // Log expected "Failed to fetch" (likely CORS) at debug level, others at warn
      const logLevel = status === "network_error" && err instanceof TypeError && err.message === "Failed to fetch" ? "debug" : "warn";
      this.log(logLevel, `Latency test failed for ${url}: ${status} - ${err.message}`);
      return { url, latency: Infinity, status, error: err.message };
    }

    const latency = Date.now() - startTime;

    // Check for RPC errors first
    if (getCodeResponse?.error) {
      status = "rpc_error";
      const errMsg = `eth_getCode RPC error ${getCodeResponse.error.code} - ${getCodeResponse.error.message}`;
      this.log("warn", `Latency test failed for ${url}: ${errMsg}`);
      return { url, latency: Infinity, status, error: errMsg };
    }
    if (syncingResponse?.error) {
      status = "rpc_error";
      const errMsg = `eth_syncing RPC error ${syncingResponse.error.code} - ${syncingResponse.error.message}`;
      this.log("warn", `Latency test failed for ${url}: ${errMsg}`);
      return { url, latency: Infinity, status, error: errMsg };
    }

    // Check sync status first
    if (syncingResponse?.result !== false) {
      status = "syncing";
      const errMsg = `Node is not synced (eth_syncing returned ${JSON.stringify(syncingResponse?.result)})`;
      this.log("warn", `RPC ${url} is syncing: ${errMsg}`);
      // Return actual latency for syncing nodes so they can be used as fallback
      return { url, latency, status, error: errMsg };
    }

    // If node is synced, check Permit2 bytecode
    if (typeof getCodeResponse?.result !== "string") {
      status = "wrong_bytecode";
      const errMsg = `Invalid bytecode response type: ${typeof getCodeResponse?.result}`;
      this.log("warn", `RPC ${url} returned invalid bytecode: ${errMsg}`);
      // Return actual latency even for wrong bytecode, in case it's needed for basic operations
      return { url, latency, status, error: errMsg };
    }

    // Log first 100 chars of both expected and received for debugging (use debug level)
    this.log("debug", `\nExpected Permit2 prefix (first 100 chars): ${PERMIT2_BYTECODE_PREFIX.slice(0, 100)}`);
    this.log("debug", `Received bytecode (first 100 chars): ${getCodeResponse.result.slice(0, 100)}`);

    if (!getCodeResponse.result.startsWith(PERMIT2_BYTECODE_PREFIX)) {
      status = "wrong_bytecode";
      // Calculate common prefix length for better error reporting
      let commonPrefixLength = 0;
      while (
        commonPrefixLength < PERMIT2_BYTECODE_PREFIX.length &&
        commonPrefixLength < getCodeResponse.result.length &&
        PERMIT2_BYTECODE_PREFIX[commonPrefixLength] === getCodeResponse.result[commonPrefixLength]
      ) {
        commonPrefixLength++;
      }
      const errMsg = `Bytecode mismatch at position ${commonPrefixLength}`;
      this.log("warn", `RPC ${url} has incorrect bytecode: ${errMsg}`);
      // Return actual latency even for wrong bytecode, in case it's needed for basic operations
      return { url, latency, status, error: errMsg };
    }

    // All checks passed - node is synced and has correct bytecode
    status = "ok";
    this.log("debug", `RPC ${url} passed all checks (${latency}ms)`);
    return { url, latency, status };
  }

  /**
   * Tests a list of RPC URLs concurrently and returns a map of URL to detailed results.
   */
  async testRpcUrls(urls: string[]): Promise<Record<string, LatencyTestResult>> {
    if (!urls || urls.length === 0) return {};
    this.log("info", `Starting latency tests for ${urls.length} RPC URLs (incl. sync & bytecode check)...`);

    const results = await Promise.allSettled(urls.map((url) => this.testSingleRpc(url)));
    const resultMap: Record<string, LatencyTestResult> = {};

    results.forEach((result, index) => {
      const url = urls[index];
      if (url === undefined) {
        this.log("error", `Error: url at index ${index} is undefined during latency test processing.`);
        return;
      }
      if (result.status === "fulfilled") {
        resultMap[url] = result.value;
      } else {
        this.log("error", `Unexpected rejection during latency test promise for ${url}:`, result.reason);
        resultMap[url] = { url, latency: Infinity, status: "network_error", error: result.reason?.message || "Unknown rejection" };
      }
    });

    this.log("info", `Latency tests completed.`);
    return resultMap;
  }
}
