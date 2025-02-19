import { HandlerConstructorConfig, RPCHandler, networkIds, networkCurrencies, networkExplorers, networkNames } from "../dist/";

/**
 * A test script to ensure that the module can be imported and used correctly
 * This script is not meant to be run in the test suite
 */

(async () => {
  // a hook that loads the correct module based on the environment
  // not required but a good to have if main/module entry is causing issues

  const config: HandlerConstructorConfig = {
    networkId: "100",
    rpcTimeout: 1500,
    autoStorage: false,
    cacheRefreshCycles: 10,
    networkName: null,
    networkRpcs: null,
    runtimeRpcs: null,
    proxySettings: {
      retryCount: 3,
      retryDelay: 500,
      logTier: "info",
      logger: null,
      strictLogs: false,
      moduleName: "[RPCHandler Provider Test] -> ",
    },
  };

  const handler = new RPCHandler(config);

  await handler.getFastestRpcProvider();

  const latencies = handler.getLatencies();
  const networkRpcs = handler.getNetworkRpcs();

  process.exit(0);
})().catch(console.error);
