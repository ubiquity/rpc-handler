# Permit2 RPC Proxy Service (Deno Deploy)

A Deno Deploy service that acts as an intelligent, CORS-friendly proxy for EVM-compatible JSON-RPC requests. It automatically selects the fastest, valid RPC endpoint from a curated whitelist for each incoming request.

## Features

- **Automatic RPC Selection:** Dynamically tests whitelisted RPCs for latency, sync status (`eth_syncing`), and specific contract bytecode (Permit2 via `eth_getCode`) to find the best endpoint. Uses an intelligent fallback system that adapts to operation requirements:
  - For standard operations: Can use any responsive RPC in order of preference: fully synced > wrong Permit2 bytecode > syncing
  - For Permit2-related operations: Only uses RPCs with correct Permit2 bytecode
- **Whitelisting:** Uses a configurable `src/rpc-whitelist.json` to manage the pool of RPCs to test.
- **Caching:** Caches detailed latency test results (including status/errors) using Deno KV to speed up subsequent requests (default 1-hour TTL).
- **Robust Fallback:** Automatically iterates through the ranked list of available RPCs if the initial attempt fails, ensuring higher resilience. Uses round-robin selection for initial attempts across concurrent requests to distribute load.
- **CORS Enabled:** Designed to be called directly from browser applications, handling preflight requests and setting appropriate CORS headers.
- **TypeScript:** Written in TypeScript.

## Usage (As a Deployed Service)

Send standard JSON-RPC 2.0 requests via `POST` to the service endpoint, including the target `chainId` in the path.

**Endpoint Format:**

```
POST https://<your-project-name>.deno.dev/rpc/{chainId}
```

Replace `<your-project-name>` with the name assigned during Deno Deploy setup (e.g., `permit2-rpc-proxy`).

**Example Request (using `fetch`):**

```javascript
const chainId = 1; // Ethereum
const rpcUrl = `https://permit2-rpc-proxy.deno.dev/rpc/${chainId}`; // Replace with your actual deployment URL

async function getBlockNumber() {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1, // Use a unique ID for each request
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      console.error('RPC Error:', data.error);
    } else {
      const blockNumber = parseInt(data.result, 16);
      console.log(`Latest block number on chain ${chainId}: ${blockNumber}`);
    }
  } catch (error) {
    console.error('Fetch Error:', error);
  }
}

getBlockNumber();
```

## Development

- **Run Locally:** `deno run --allow-net --allow-read --allow-env src/deno-server.ts`
- **Test:** `deno test --allow-net --allow-read --allow-env` (Assuming tests are adapted for Deno)
- **Update Whitelist from Submodule:** `bun run whitelist:update` (Requires `chainlist:generate` to be run first if submodule changed)
- **Test Whitelist Connectivity:** `bun run whitelist:test`
- **Format (Prettier):** `bun run format`
- **Format (Deno):** `deno fmt`
- **Lint (Deno):** `deno lint`

## Whitelist

Modify `src/rpc-whitelist.json` to add/remove RPC endpoints for specific chain IDs. The manager will only test URLs listed in this file.

## Latency Testing & Selection

The `LatencyTester` performs the following checks concurrently for each whitelisted RPC:

1.  **Permit2 Bytecode:** Sends `eth_getCode` to the Permit2 address (`0x000000000022D473030F116dDEE9F6B43aC78BA3`) and verifies the returned bytecode matches the first 13995 bytes. The prefix check ensures the Permit2 contract is correctly deployed, but allows for potential minor deployment differences across chains. The byte comparison is exact, and any mismatch results in `status: 'wrong_bytecode'`.
2.  **Sync Status:** Sends `eth_syncing` and verifies the result is `false`. Failure results in `status: 'syncing'`.
3.  **Connectivity/Timeout:** Checks for network errors, HTTP errors, RPC errors, or timeouts during the above calls.

The `RpcSelector` uses these test results to select an endpoint based on operation needs:

- Priority 1: RPCs with `status: 'ok'` (fully synced, correct bytecode) - sorted by latency
- Priority 2: RPCs with `status: 'wrong_bytecode'` (synced but incorrect Permit2 bytecode) - sorted by latency
  - These RPCs are fully functional for most operations
  - Only excluded when Permit2-specific functionality is needed
- Priority 3: RPCs with `status: 'syncing'` (not fully synced) - sorted by latency
  - May have correct bytecode but need time to sync
  - Useful as last resort for basic calls
- Excluded: RPCs with network errors, timeouts, HTTP errors, or authentication failures (`rpc_error` from test).

This prioritization ensures:

- Basic operations (like `eth_call` for token symbol) work reliably by using any responsive RPC.
- Permit2-related operations only use RPCs with exact bytecode match.
- Performance is optimized by selecting the fastest RPC within each priority level.
- Maximum availability through iterative fallback across the entire ranked list of usable RPCs.
- Load distribution across RPCs for concurrent requests via round-robin starting point selection.
