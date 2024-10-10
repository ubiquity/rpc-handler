import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: ["src/index.ts", "src/services/*.ts"],
  project: ["src/**/*.ts"],
  ignore: ["src/types/config.ts", "tests/*", ".github/workflows/**"],
  ignoreExportsUsedInFile: true,
  ignoreDependencies: ["axios", "ts-node", "node-fetch", "eslint-config-prettier", "eslint-plugin-prettier", "@types/node-fetch"],
};

export default config;
