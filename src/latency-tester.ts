// Define the structure for the JSON-RPC request body
interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any[];
  id: number | string;
}

// Define a basic structure for the JSON-RPC response
interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

const DEFAULT_TIMEOUT_MS = 5000; // 5 seconds timeout for latency test

export class LatencyTester {
  private testMethod = 'eth_blockNumber'; // Lightweight method for testing
  private testParams: any[] = [];
  private timeoutMs: number;

  constructor(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * Tests the latency of a single RPC URL.
   * Returns latency in milliseconds or Infinity if the test fails or times out.
   */
  private async testSingleRpc(url: string): Promise<number> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    const requestBody: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: this.testMethod,
      params: this.testParams,
      id: `latency-test-${Date.now()}`,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal, // Link abort controller
      });

      clearTimeout(timeoutId); // Clear timeout if fetch completes

      if (!response.ok) {
        // HTTP error (e.g., 404, 500)
        console.warn(`Latency test failed for ${url}: HTTP status ${response.status}`);
        return Infinity;
      }

      const responseData: JsonRpcResponse = await response.json();

      if (responseData.error) {
        // JSON-RPC error
        console.warn(`Latency test failed for ${url}: RPC error ${responseData.error.code} - ${responseData.error.message}`);
        return Infinity;
      }

      // Success
      const latency = Date.now() - startTime;
      return latency;

    } catch (error: any) {
      clearTimeout(timeoutId); // Clear timeout on error
      if (error.name === 'AbortError') {
        console.warn(`Latency test timed out for ${url} after ${this.timeoutMs}ms`);
      } else {
        console.warn(`Latency test failed for ${url}: ${error.message}`);
      }
      return Infinity;
    }
  }

  /**
   * Tests a list of RPC URLs concurrently and returns a map of URL to latency.
   * Failed or timed-out tests will have a latency of Infinity.
   */
  async testRpcUrls(urls: string[]): Promise<Record<string, number>> {
    if (!urls || urls.length === 0) {
      return {};
    }

    console.log(`Starting latency tests for ${urls.length} RPC URLs...`);

    const results = await Promise.allSettled(
      urls.map(url => this.testSingleRpc(url))
    );

    const latencyMap: Record<string, number> = {};
    results.forEach((result, index) => {
      const url = urls[index];

      // Add check to satisfy noUncheckedIndexedAccess
      if (url === undefined) {
        console.error(`Error: url at index ${index} is undefined during latency test processing.`);
        return; // Skip this iteration (should not happen)
      }

      if (result.status === 'fulfilled') {
        latencyMap[url] = result.value;
      } else {
        // Should ideally not happen with current testSingleRpc implementation,
        // but handle defensively. testSingleRpc returns Infinity on error.
        console.error(`Unexpected rejection during latency test for ${url}:`, result.reason);
        latencyMap[url] = Infinity;
      }
    });

    console.log(`Latency tests completed.`);
    return latencyMap;
  }
}

// Example usage (optional, for testing)
/*
async function test() {
    const tester = new LatencyTester();
    const urlsToTest = [
        "https://rpc.ankr.com/eth", // Example valid URL
        "https://cloudflare-eth.com", // Example valid URL
        "https://invalid-dummy-url-12345.org", // Example invalid URL
        "http://http-not-https.com" // Example non-https
    ];
    const latencies = await tester.testRpcUrls(urlsToTest);
    console.log("Latency Results:", latencies);
}
test();
*/
