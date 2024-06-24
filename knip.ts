import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: ["src/index.ts", "src/services/*.ts"],
  project: ["src/**/*.ts"],
  ignore: ["src/types/config.ts", "tests/*"],
  ignoreExportsUsedInFile: true,
  ignoreDependencies: ["axios", "ts-node", "node-fetch", "eslint-config-prettier", "eslint-plugin-prettier", "@types/jest", "@types/node-fetch"],
  jest: {
    config: ["jest.config.ts"],
    entry: ["tests/*.ts"],
  },
};

export default config;
