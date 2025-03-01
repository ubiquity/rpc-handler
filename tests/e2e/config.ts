import { HandlerConstructorConfig } from "../../dist";
import { testConfig } from "../constants";

export const e2eConfig: HandlerConstructorConfig = {
  ...testConfig,
  proxySettings: {
    ...testConfig.proxySettings,
    strictLogs: false,
    moduleName: "RPCHandler-E2E-Tests",
  },
};
