import { HandlerConstructorConfig } from "../../src/handler";
import { networkIds, tokens, networkNames, networkCurrencies, networkRpcs, networkExplorers } from "../../src/constants";

export const testConfig: HandlerConstructorConfig = {
  cacheRefreshCycles: 10,
  autoStorage: false,
  runtimeRpcs: [],
  networkIds,
  tokens,
  networkNames,
  networkCurrencies,
  networkRpcs,
  networkExplorers,
};
