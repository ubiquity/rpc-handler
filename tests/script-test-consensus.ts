import { HandlerConstructorConfig, RPCHandler } from "../dist";
import { RequestPayload } from "../dist/types/rpc-service";

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
      moduleName: "[RPCHandler-Script-Test] -> ",
    },
  };

  const handler = new RPCHandler(config);

  const reqPayload: RequestPayload = {
    jsonrpc: "2.0",
    method: "eth_getBlockByNumber",
    params: ["latest", false],
    id: 1,
    headers: {
      "Content-Type": "application/json",
    },
  };

  await handler.consensusCall(reqPayload, "0.5");
  process.exit(0);
})().catch(console.error);
