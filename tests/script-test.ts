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
    networkId: 1,
    rpcTimeout: 1500,
    autoStorage: false,
    cacheRefreshCycles: 10,
    networkName: null,
    networkRpcs: null,
    runtimeRpcs: null,
  };

  const handler: RPCHandler = new RPCHandler(config);

  await handler.getFastestRpcProvider();

  const latencies = handler.getLatencies();

  console.log("=====================================");
  console.log(networkIds);
  console.log("=====================================");
  console.log(networkNames);
  console.log("=====================================");
  console.log(networkRpcs);
  console.log("=====================================");
  console.log(networkCurrencies);
  console.log("=====================================");
  console.log(networkExplorers);
  console.log("=====================================");
  console.log(latencies);
  process.exit(0);
})().catch(console.error);
