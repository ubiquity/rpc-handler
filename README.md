# `@ubiquity/rpc-handler`

This packages leverages [Chainlist's](https://github.com/DefiLlama/chainlist) network RPC list to return the lowest latency provider from the list for any given network ID.

## Features

- Returns the lowest latency provider for a given network ID
- Drops bad endpoints from the list and creates a runtime/local storage cache
- Can re-test the cached RPCs by calling `handler.getFastestRpcProvider()` optionally passing a network ID
- Can be used in both the browser and Node.js
- Fully configurable and extendable
- Only uses endpoints which Chainlist report as tracking _no_ data (see [`extraRpcs.js`](https://github.com/DefiLlama/chainlist/blob/main/constants/extraRpcs.js))

## Installation

```bash
yarn add @ubiquity/rpc-handler
```

## Usage

- Import the handler for your environment

```typescript
import { RPCHandler } from "@ubiquity/rpc-handler/dist/esm/rpc-handler";
```

- Instantiate the handler with your network ID

```typescript
const handler = new RPCHandler(100);
```

###### or

```typescript
const handler = await RPCHandler.getInstance(1);
```

- Get the provider

```typescript
const provider = handler.getProvider();
```

- Re-test the cached RPCs

```typescript
const provider = handler.getFastestRpcProvider();
```

- Optionally, you can pass a custom config object to the constructor or `getInstance()` method

```typescript
import { networkIds, tokens, networkNames, networkCurrencies, networkRpcs, networkExplorers } from "@ubiquity/rpc-handler/dist/esm/constants";

import { HandlerConstructorConfig } from "@ubiquity/rpc-handler/dist/esm/handler";

const customConfig: HandlerConstructorConfig = {
  cacheRefreshCycles: 10,
  autoStorage: false,
  runtimeRpcs: [],
  networkIds: [],
  tokens: [],
  networkNames: [],
  networkCurrencies: [],
  networkRpcs: [],
  networkExplorers: [],
};

const handler = new RPCHandler(100, customConfig);
```

- The RPCs are tested on instantiation and the lowest latency provider is returned
- You can re-test the cached RPCs by calling `handler.getFastestRpcProvider()` optionally passing a network ID
- See the full [config](src\handler.ts) object (optionally passed in the constructor) for more options
- Local storage is not enabled by default, but can be enabled by passing `autoStorage: true` in the config object
- The `cacheRefreshCycles` is the number of roundtrips made before clearing the cache and re-testing all RPCs again

## Testing

```bash
yarn test
```
