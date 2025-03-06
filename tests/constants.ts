import { HandlerConstructorConfig } from "../types/handler";
import { PrettyLogs } from "../types/logs";

export const testConfig: HandlerConstructorConfig = {
  networkId: "100" as const,
  autoStorage: false,
  cacheRefreshCycles: 3,
  networkName: null,
  rpcTimeout: 10000,
  runtimeRpcs: null,
  networkRpcs: null,
  proxySettings: {
    retryCount: 3,
    retryDelay: 10,
    logTier: "verbose",
    logger: new PrettyLogs(),
    strictLogs: true,
    moduleName: "RPCHandler-Unit-Tests",
  },
};
