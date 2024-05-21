# `@ubiquity-dao/rpc-handler`

This packages leverages [Chainlist's](https://github.com/DefiLlama/chainlist) network RPC list to return the lowest latency provider from the list for any given network ID.

## Features

- Returns the lowest latency provider for a given network ID
- Drops bad endpoints from the list and creates a runtime/local storage cache
- Can re-test the cached RPCs by calling `handler.getFastestRpcProvider()`
- Can be used in both the browser and Node.js
- Fully configurable and extendable
- Only uses endpoints which Chainlist report as tracking _no_ data (see [`extraRpcs.js`](https://github.com/DefiLlama/chainlist/blob/main/constants/extraRpcs.js))

## Installation

```bash
yarn add @ubiquity-dao/rpc-handler
```

## Usage

- Config options with null are optional, but still need to be passed as `null`

```typescript
import { RPCHandler, HandlerConstructorConfig } from "@ubiquity-dao/rpc-handler/";

export function useHandler(networkId: number) {
  const config: HandlerConstructorConfig = {
    networkId: 1,
    rpcTimeout: 1500,
    autoStorage: false,
    cacheRefreshCycles: 10,
    networkName: null, // the name will be deduced from the networkId, unless using a custom network
    networkRpcs: null, // same as networkName, but for injecting additional RPCs
    runtimeRpcs: null, // same as networkRpcs, although these are considered error-free
  };
  // No RPCs are tested at this point
  return new RPCHandler(config);
}
```

```typescript
import { useHandler } from "./rpc-handler";
const handler = useHandler(networkId);

// Now the RPCs are tested
app.provider = await handler.getFastestRpcProvider();
```

#### Notes

- The RPCs are not tested on instantiation, but are tested on each call to `handler.getFastestRpcProvider()` or `handler.testRpcPerformance()`

- See the full [config](src\handler.ts) object (optionally passed in the constructor) for more options

- Local storage is not enabled by default, but can be enabled by passing `autoStorage: true` in the config object

- The `cacheRefreshCycles` is the number of roundtrips made before clearing the cache and re-testing all RPCs again

## Testing

- Tests have a specific build in order to run `yarn test` will produce this build and run the tests.
- After testing, re-build using `yarn build` for the original build

```bash
yarn test
```

- This below will only work after `yarn build` has been run and will fail under test conditions
```bash
npx tsx tests/script-test.ts
```