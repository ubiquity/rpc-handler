import esbuild from "esbuild";
import chainlist from "../lib/chainlist/constants/extraRpcs";
import chainIDList from "../lib/chainlist/constants/chainIds.json";
import path from "path";
import * as fs from "fs";
import { createEnvDefines, prepareBuildOptions, prepareExtraRpcs } from "./shared";
import { RpcType } from "../types/shared";

const typescriptEntries = ["tests/mocks/rpc-handler.ts"];
export const entries = [...typescriptEntries];
const extraRpcs: Record<string, { rpcs: RpcType[] }> = prepareExtraRpcs(chainlist);

export const esBuildContext: esbuild.BuildOptions = prepareBuildOptions(entries, extraRpcs, chainIDList);

async function main() {
  try {
    await buildForEnvironments();
    await buildIndex();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();

async function buildForEnvironments() {
  ensureDistDir();

  await esbuild
    .build({
      ...esBuildContext,
      tsconfig: "tsconfig.tests.json",
      platform: "node",
      outdir: "dist/tests/mocks",
      format: "cjs",
    })
    .then(() => {
      console.log("Node.js esbuild complete");
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

async function buildIndex() {
  await esbuild.build({
    entryPoints: ["index.ts"],
    bundle: true,
    format: "cjs",
    outfile: "dist/index.js",
    define: createEnvDefines({ extraRpcs, chainIDList }),
  });

  console.log("Index build complete.");
}

function ensureDistDir() {
  const distPath = path.resolve(__dirname, "dist");
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true });
  }
}
