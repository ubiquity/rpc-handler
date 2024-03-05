# `@ubiquity/rpc-handler`

This packages leverages [Chainlist's](https://github.com/DefiLlama/chainlist) network RPC list to return the lowest latency provider from the list for any given network ID.

## Features

- Returns the lowest latency provider for a given network ID
- Drops bad endpoints from the list and creates a runtime/local storage cache
- Can re-test the cached RPCs by calling `handler.getFastestRpcProvider(networkId)`
- Can be used in both the browser and Node.js
- Fully configurable and extendable
- Only uses endpoints which Chainlist report as tracking _no_ data (see [`extraRpcs.js`](https://github.com/DefiLlama/chainlist/blob/main/constants/extraRpcs.js))

## Installation

```bash
yarn add @ubiquity/rpc-handler
```

## Usage

- Import the handler for your environment

###### Browser

```typescript
import { HandlerConstructorConfig } from "@ubiquity/rpc-handler/dist/esm/src/handler";
import { RPCHandler } from "@ubiquity/rpc-handler/dist/esm/src/rpc-handler";

const config: HandlerConstructorConfig = {
  autoStorage: true,
  cacheRefreshCycles: 5,
};

export function useHandler(networkId: number) {
  // No RPCs are tested at this point
  return new RPCHandler(networkId, config);
}
```

```typescript
import { useHandler } from "./rpc-handler";
const handler = useHandler(networkId);

// Now the RPCs are tested
app.provider = handler.getFastestRpcProvider(networkId);
```

###### Node.js

```typescript
import { HandlerConstructorConfig } from "@ubiquity/rpc-handler/dist/cjs/src/handler";
import { RPCHandler } from "@ubiquity/rpc-handler/dist/cjs/src/rpc-handler";

const config: HandlerConstructorConfig = {
  autoStorage: true,
  cacheRefreshCycles: 5,
};

async function main() {
  const networkId = 100;
  const handler = new RPCHandler(networkId, config);
  return await handler.getFastestRpcProvider(networkId);
}

main().then(console.log).catch(console.error);
```

#### Notes

- The RPCs are not tested on instantiation, but are tested on each call to `handler.getFastestRpcProvider()` or `handler.testRpcPerformance()`

- See the full [config](src\handler.ts) object (optionally passed in the constructor) for more options

- Local storage is not enabled by default, but can be enabled by passing `autoStorage: true` in the config object

- The `cacheRefreshCycles` is the number of roundtrips made before clearing the cache and re-testing all RPCs again

## Testing

- In order to run the tests the package must first be built, this is required otherwise `networkRpcs` will be empty as the RPCs are injected at build time

```bash
yarn test
```
