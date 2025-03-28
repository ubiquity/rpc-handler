# RPC Handler

An intelligent RPC handler for EVM-compatible chains that automatically selects the fastest, valid RPC endpoint from a curated whitelist.

## Features

-   **Automatic RPC Selection:** Dynamically tests whitelisted RPCs for latency, sync status (`eth_syncing`), and specific contract bytecode (Permit2 via `eth_getCode`) to find the best endpoint. Prioritizes fully valid ('ok') RPCs, but falls back to the fastest 'syncing' RPC if no 'ok' options are available. Never uses RPCs with incorrect bytecode.
-   **Whitelisting:** Uses a configurable `src/rpc-whitelist.json` to manage the pool of RPCs to test.
-   **Caching:** Caches detailed latency test results (including status/errors) in `.rpc-cache.json` (Node.js) or `localStorage` (browser) to speed up subsequent requests (default 1-hour TTL).
-   **Fallback:** Automatically retries requests with the next fastest valid RPC (using the same 'ok' > 'syncing' priority) if the primary choice fails.
-   **Contract Interaction:** Includes a `readContract` helper function (using `viem`) for easy read-only smart contract calls (requires user-provided ABI).
-   **TypeScript:** Written in TypeScript with type definitions.

## Installation

```bash
bun install # Or npm install / yarn install
```

## Usage

### Basic RPC Calls (`eth_blockNumber`, etc.)

```typescript
import { RpcHandler } from './src/index.js'; // Adjust import path as needed

async function example() {
  // Optionally configure timeouts and cache TTL
  const handler = new RpcHandler({
    latencyTimeoutMs: 5000, // Timeout for latency tests
    requestTimeoutMs: 10000, // Timeout for actual RPC calls
    // cacheTtlMs: 60 * 60 * 1000 // Default is 1 hour
  });

  const chainId = 1; // Ethereum

  try {
    const blockNumberHex = await handler.send<string>(chainId, 'eth_blockNumber');
    const blockNumber = parseInt(blockNumberHex, 16);
    console.log(`Latest block number on chain ${chainId}: ${blockNumber}`);

    // Example: Get balance
    // const balanceHex = await handler.send<string>(chainId, 'eth_getBalance', [address, 'latest']);
    // console.log(`Balance: ${balanceHex}`);

  } catch (error) {
    console.error(`Error fetching data for chain ${chainId}:`, error);
  }
}

example();
```

### Smart Contract Calls (`readContract`)

```typescript
import { RpcHandler, readContract } from './src/index.js'; // Adjust import path
import type { Address, Abi } from 'viem';

// Define your contract ABI (e.g., ERC20 subset)
const erc20Abi = [
  {
    inputs: [], name: "symbol", outputs: [{ type: "string" }],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [{ name: 'account', type: 'address' }], name: "balanceOf",
    outputs: [{ type: "uint256" }], stateMutability: "view", type: "function"
  },
] as const; // Use 'as const'

const handler = new RpcHandler();
const chainId = 1; // Ethereum
const usdcAddress: Address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const someAccount: Address = '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503';

async function getContractInfo() {
  try {
    const symbol = await readContract<string>({
      handler,
      chainId,
      address: usdcAddress,
      abi: erc20Abi,
      functionName: 'symbol',
    });
    console.log(`Token Symbol: ${symbol}`);

    const balance = await readContract<bigint>({
        handler,
        chainId,
        address: usdcAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [someAccount]
    });
    console.log(`Balance of ${someAccount}: ${balance.toString()}`);

  } catch (error) {
    console.error("Contract read error:", error);
  }
}

getContractInfo();
```

## Development

-   **Build:** `bun run build` (Uses `esbuild`, defined in `package.json`)
-   **Test:** `bun test` (Uses Bun's built-in test runner)
-   **Run Example:** Uncomment the `main()` call in `src/rpc-handler.ts` and run `bun run src/rpc-handler.ts`.

## Whitelist

Modify `src/rpc-whitelist.json` to add/remove RPC endpoints for specific chain IDs. The handler will only test URLs listed in this file.

## Latency Testing & Selection

The `LatencyTester` performs the following checks concurrently for each whitelisted RPC:
1.  **Permit2 Bytecode:** Sends `eth_getCode` to the Permit2 address (`0x000000000022D473030F116dDEE9F6B43aC78BA3`) and verifies the returned bytecode prefix. Failure results in `status: 'wrong_bytecode'`.
2.  **Sync Status:** Sends `eth_syncing` and verifies the result is `false`. Failure results in `status: 'syncing'`.
3.  **Connectivity/Timeout:** Checks for network errors, HTTP errors, RPC errors, or timeouts during the above calls.

The `RpcSelector` then uses these results:
-   It prioritizes the RPC with the lowest latency that has `status: 'ok'` (passed both checks).
-   If no RPC has `status: 'ok'`, it falls back to selecting the RPC with the lowest latency that has `status: 'syncing'` (passed bytecode check, failed sync check).
-   If no RPC meets either of these criteria, no endpoint is selected.
