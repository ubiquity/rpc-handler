# `@ubiquity-dao/rpc-handler`

## Why use this package?

- **No more slow RPCs**: No more slow RPCs, no more failed requests, no more headaches
- **Fastest RPCs**: Returns the fastest RPC for a given network ID
- **Fallback mechanism**: Retries failed method calls on the next fastest provider
- **Retries failed method calls**: Retries failed method calls on the next fastest provider
- **No more searching for RPCs**: No need to for an RPC URL again, just pass the network ID
- **Fully configurable**: Configure the number of retries, retry delay, log tier and more
- **Browser and Node.js support**: Can be used in both the browser and Node.js
- **Local storage cache**: Stores the fastest RPCs for a given network ID in the browser's local storage
- **Drop-in replacement**: No changes required to your existing codebase, just replace your current provider with the one returned by `RPCHandler.getFastestRpcProvider()`
- **No tracking or analytics**: No additional tracking, data collection or analytics performed by this package beyond the specific public endpoints that support those features

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
    networkId: 1;
    networkName:  null; // will default using the networkRpcs
    networkRpcs:  null; // e.g "https://mainnet.infura.io/..."
    runtimeRpcs:  null; // e.g "<networkId>__https://mainnet.infura.io/..." > "1__https://mainnet.infura.io/..."
    autoStorage: true; // browser only, will store in localStorage
    cacheRefreshCycles: 10; // bad RPCs are excluded if they fail, this is how many cycles before they're re-tested
    rpcTimeout: 1500; // when the RPCs are tested they are raced, this is the max time to allow for a response
    tracking: "yes", // accepted values: "yes" | "limited" | "none". This is the data tracking status of the RPC, not this package.
    proxySettings: {
      retryCount: 3; // how many times we'll loop the list of RPCs retrying the request before failing
      retryDelay: 100; // (ms) how long we'll wait before moving to the next RPC, best to keep this low
      logTier: "ok"|"info"|"error"|"debug"|"fatal"|"verbose"; // set to "none" for no logs, null will default to "error", "verbose" will log all
      logger: PrettyLogs | LogInterface | null; // null will default to PrettyLogs
      strictLogs: boolean; // true, only the specified logTier will be logged and false all wll be logged.
      moduleName?: ModuleName | string; // this is the prefix for the logs
      disabled?: boolean; // this will disable the proxy, requiring you to handle retry logic etc yourself
    }
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

- See the full [config](types/handler.ts) object (optionally passed in the constructor) for more options

- LocalStorage is not enabled by default, but can be enabled by passing `autoStorage: true` in the config object

- Use the returned `JsonRpcProvider` object as you would normally, internally, any call you pass through it will be retried on the next fastest provider if it fails. It should only ever really throw due to user error or a network issue.

## Testing

1. Build the package:

```bash
yarn build
```

2. In terminal A run the following command to start a local Anvil instance:

```bash
yarn test:anvil
```

3. In terminal B run the following command to run the tests:

```bash
yarn test
```

## Say goodbye to slow RPCs

This packages leverages [Chainlist's](https://github.com/DefiLlama/chainlist) network RPC list to return the lowest latency provider from the list for any given network ID. Creating a runtime/local storage cache of the fastest RPCs, it can be used in both the browser and Node.js.

By default it performs as an abstraction layer for the Web3 developer by having built-in failed method call retries, bad endpoint exclusion and a cache of the fastest RPCs for a given network ID. It serves as a drop-in replacement for any `JsonRpcProvider` and can be extended to handle custom RPCs, chains and more.

By routing requests through this package, it ensures the lowest latency for your users, while also providing a fallback mechanism for when the fastest provider fails. As even the best of nodes can fail, it retries failed method calls on the next fastest provider and so on until it succeeds or until your custom breakpoints are reached. With the ability to configure the number of retries, retry delay, log tier, breakpoints and more, it can be tailored to your specific needs.

There is no additional tracking, data collection or analytics performed by this package beyond the specific public endpoints that support those features. These will be made filterable in the future. Calls are made directly to the RPCs and the only data stored is the `Record` of RPCs for a given network ID, which can be stored in the browser's local storage for faster retrieval.

No changes are required to your existing codebase, simply replace your current provider with the one returned by `RPCHandler.getFastestRpcProvider()` and you're good to go. While all attempts are made to ensure the fastest provider is always used, it's important to note that the fastest provider can change over time, so it's recommended to call `RPCHandler.getFastestRpcProvider()` at the start of your app or at regular intervals. Also, it is possible that all providers fail, in which case the package will throw an error.

No more slow RPCs, no more failed requests, no more headaches.
