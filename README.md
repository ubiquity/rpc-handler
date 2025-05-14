# This Package Has Been Deprecated

Use [@ubiquity-dao/permit2-rpc-client](https://github.com/ubiquity/permit2-rpc-manager/blob/main/packages/permit2-rpc-client/README.md)

```sh
bun add @ubiquity-dao/permit2-rpc-client
```

---

# Permit2 RPC Manager

An intelligent RPC manager for EVM-compatible chains that automatically selects the fastest, valid RPC endpoint from a curated whitelist.

## Features

- **Automatic RPC Selection:** Dynamically tests whitelisted RPCs for latency, sync status (`eth_syncing`), and specific contract bytecode (Permit2 via `eth_getCode`) to find the best endpoint. Uses an intelligent fallback system that adapts to operation requirements:
  - For standard operations: Can use any responsive RPC in order of preference: fully synced > wrong Permit2 bytecode > syncing
  - For Permit2-related operations: Only uses RPCs with correct Permit2 bytecode
- **Whitelisting:** Uses a configurable `src/rpc-whitelist.json` to manage the pool of RPCs to test.
- **Caching:** Caches detailed latency test results (including status/errors) in `.rpc-cache.json` (Node.js) or `localStorage` (browser) to speed up subsequent requests (default 1-hour TTL).
- **Robust Fallback:** Automatically iterates through the ranked list of available RPCs if the initial attempt fails, ensuring higher resilience. Uses round-robin selection for initial attempts across concurrent requests to distribute load.
- **Contract Interaction:** Includes a `readContract` helper function (using `viem`) for easy read-only smart contract calls (requires user-provided ABI).
- **Configurable Logging:** Control log verbosity (`debug`, `info`, `warn`, `error`, `none`) via constructor options. Default is `warn`.
- **Isomorphic:** Designed for both Node.js/Bun backend and browser/worker environments. Uses `localStorage` for caching in browsers and defaults to a temporary file in Node.js (configurable path).
- **TypeScript:** Written in TypeScript with type definitions and source maps included in the build.

## Installation

```bash
bun install # Or npm install / yarn install
```

## Usage

### Basic RPC Calls (`eth_blockNumber`, etc.)

```typescript
import { Permit2RpcManager } from "./src/index.ts"; // Adjust import path as needed

async function example() {
  // Optionally configure timeouts and cache TTL
  const manager = new Permit2RpcManager({
    latencyTimeoutMs: 5000, // Timeout for latency tests
    requestTimeoutMs: 10000, // Timeout for actual RPC calls
    // cacheTtlMs: 60 * 60 * 1000, // Default is 1 hour
    // logLevel: 'info', // Default is 'warn'
    // nodeCachePath: '/path/to/my/cache.json', // Optional: Specify cache file path for Node.js
    // initialRpcData: { rpcs: { '1': ['https://my-custom-rpc.com'] } } // Optional: Override default whitelist
  });

  const chainId = 1; // Ethereum

  try {
    const blockNumberHex = await manager.send<string>(chainId, "eth_blockNumber");
    const blockNumber = parseInt(blockNumberHex, 16);
    console.log(`Latest block number on chain ${chainId}: ${blockNumber}`);

    // Example: Get balance
    // const balanceHex = await manager.send<string>(chainId, 'eth_getBalance', [address, 'latest']);
    // console.log(`Balance: ${balanceHex}`);
  } catch (error) {
    console.error(`Error fetching data for chain ${chainId}:`, error);
  }
}

example();
```

### Smart Contract Calls (`readContract`)

```typescript
import { Permit2RpcManager, readContract } from "./src/index.ts"; // Adjust import path
import type { Address, Abi } from "viem";

// Define your contract ABI (e.g., ERC20 subset)
const erc20Abi = [
  {
    inputs: [],
    name: "symbol",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const; // Use 'as const'

const manager = new Permit2RpcManager();
const chainId = 1; // Ethereum
const usdcAddress: Address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const someAccount: Address = "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503";

async function getContractInfo() {
  try {
    const symbol = await readContract<string>({
      manager,
      chainId,
      address: usdcAddress,
      abi: erc20Abi,
      functionName: "symbol",
    });
    console.log(`Token Symbol: ${symbol}`);

    const balance = await readContract<bigint>({
      manager,
      chainId,
      address: usdcAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [someAccount],
    });
    console.log(`Balance of ${someAccount}: ${balance.toString()}`);
  } catch (error) {
    console.error("Contract read error:", error);
  }
}

getContractInfo();
```

## Development

- **Build (Node Target):** `bun run build` (For publishing to npm)
- **Build (Browser Target):** `bun run build:browser` (For direct browser usage/testing)
- **Test:** `bun test`
- **Watch & Rebuild (Node):** `bun run watch`
- **Watch & Rebuild + Live Server (Browser Test):** `bun run dev:browser` (Opens `index.html`)
- **Update Whitelist from Submodule:** `bun run whitelist:update` (Requires `chainlist:generate` to be run first if submodule changed)
- **Test Whitelist Connectivity:** `bun run whitelist:test`
- **Format:** `bun run format`
- **Release New Version:** `npm run release:patch` (or `minor`/`major`) - Requires clean git state & NPM_TOKEN env var.

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
- Excluded: RPCs with network errors (including CORS errors in browser), timeouts, HTTP errors, or authentication failures (`rpc_error` from test).

This prioritization ensures:

- Basic operations (like `eth_call` for token symbol) work reliably by using any responsive RPC
- Permit2-related operations only use RPCs with exact bytecode match
- Performance is optimized by selecting the fastest RPC within each priority level.
- Maximum availability through iterative fallback across the entire ranked list of usable RPCs.
- Load distribution across RPCs for concurrent requests via round-robin starting point selection.

Note: For browser usage, the effectiveness relies on the `rpc-whitelist.json` containing RPCs with permissive CORS headers. The library will filter out non-CORS-friendly RPCs during latency testing.
