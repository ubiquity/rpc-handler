# Permit2 RPC Client SDK Package

This package provides a lightweight TypeScript client SDK for interacting with the deployed `permit2-rpc-server` service.

Refer to the [root README.md](../../README.md) for overall project information.

## Installation

```bash
npm install @pavlovcik/permit2-rpc-client
# or
yarn add @pavlovcik/permit2-rpc-client
# or
bun add @pavlovcik/permit2-rpc-client
```

## Usage

```typescript
import { createRpcClient } from '@pavlovcik/permit2-rpc-client';

// Initialize the client with the base URL of your deployed proxy service
const client = createRpcClient({
  baseUrl: "https://your-permit2-rpc-proxy.deno.dev" // Replace with your deployment URL
});

async function example() {
  const chainId = 1; // Ethereum

  try {
    // Single request
    const blockResponse = await client.request(chainId, {
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1
    });
    console.log("Single Response:", blockResponse);
    // Access result if needed (check for errors first in real code)
    // if (!Array.isArray(blockResponse) && blockResponse.result) {
    //   console.log("Block Number:", parseInt(blockResponse.result as string, 16));
    // }

    // Batch request
    const batchResponse = await client.request(chainId, [
      { jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 10 },
      { jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 11 }
    ]);
    console.log("Batch Response:", batchResponse);

  } catch (error) {
    console.error("RPC Client Error:", error);
  }
}

example();
```

## Development

Use scripts defined in `package.json`:

-   `bun run build`: Build the SDK for distribution (ESM, CJS, types).
-   `bun run dev`: Watch source files and rebuild automatically.
-   `bun run format`: Format code with Prettier.
-   `bun run lint`: Lint code (currently placeholder).
-   `bun run test`: Run tests (currently placeholder).

## Publishing

Run `bun run prepublishOnly` (which triggers `bun run build`) before publishing to npm.
