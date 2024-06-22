import getRPCHandler, { HandlerConstructorConfig, RPCHandler, networkIds, networkCurrencies, networkExplorers, networkNames, networkRpcs } from "../dist/";

/**
 * This script is meant to test the `yarn build` build output
 * while the jest tests work under the `yarn test` build output.
 *
 * Both have different esbuild configurations, this is to ensure that the
 * library works in both scenarios.
 */

(async () => {
  // a hook that loads the correct module based on the environment
  // not required but a good to have if main/module entry is causing issues
  const RPCHandler = await getRPCHandler();

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

  const handler: RPCHandler = new RPCHandler(config);

  await handler.getFastestRpcProvider();

  const latencies = handler.getLatencies();

  console.log(networkIds);
  console.log(networkNames);
  console.log(networkRpcs);
  console.log(networkCurrencies);
  console.log(networkExplorers);
  console.log(latencies);
  process.exit(0);
})().catch(console.error);
