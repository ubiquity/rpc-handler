import esbuild from "esbuild";
import chainlist from "../lib/chainlist/constants/extraRpcs";

const typescriptEntries = ["rpc-handler.ts", "constants.ts", "handler.ts", "services/rpc-service.ts", "services/storage-service.ts"];
export const entries = [...typescriptEntries];
const extraRpcs: Record<string, string[]> = {};
// this flattens all the rpcs into a single object, with key names that match the networkIds. The arrays are just of URLs per network ID.

Object.keys(chainlist).forEach((networkId) => {
  const officialUrls = chainlist[networkId].rpcs.filter((rpc) => typeof rpc === "string");
  const extraUrls: string[] = chainlist[networkId].rpcs.filter((rpc) => rpc.url !== undefined && rpc.tracking === "none").map((rpc) => rpc.url);

  extraRpcs[networkId] = [...officialUrls, ...extraUrls];
});

export const esBuildContext: esbuild.BuildOptions = {
  entryPoints: entries,
  bundle: true,
  minify: true,

  outdir: "dist",
  define: createEnvDefines({ extraRpcs }),
};

esbuild
  .build({
    ...esBuildContext,
    tsconfig: "tsconfig.node.json",
    platform: "node",
    outdir: "dist/cjs",
    format: "cjs",
  })
  .then(() => {
    console.log("Node.js esbuild complete");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

esbuild
  .build({
    ...esBuildContext,
    tsconfig: "tsconfig.web.json",
    platform: "browser",
    outdir: "dist/esm",
    format: "esm",
  })
  .then(() => {
    console.log("Frontend esbuild complete");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

function createEnvDefines(generatedAtBuild: Record<string, unknown>): Record<string, string> {
  const defines: Record<string, string> = {};

  Object.keys(generatedAtBuild).forEach((key) => {
    defines[key] = JSON.stringify(generatedAtBuild[key]);
  });

  return defines;
}
