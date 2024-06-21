import { RpcType } from "../types/shared";

export function prepareExtraRpcs(chainlist) {
  let extraRpcs: Record<string, { rpcs: RpcType[] }> = {};
  // this flattens all the rpcs into a single object, with key names that match the networkIds.
  Object.keys(chainlist).forEach((networkId) => {
    let rpcs = chainlist[networkId].rpcs.filter((rpc) => {
      const url = typeof rpc === "string" ? rpc : rpc.url;
      return url.startsWith("https://");
    });
    extraRpcs[networkId] = { rpcs };
  });

  return extraRpcs;
}

export function prepareBuildOptions(entries, extraRpcs, chainIDList) {
  return {
    entryPoints: entries,
    bundle: true,

    outdir: "dist",
    define: createEnvDefines({ extraRpcs, chainIDList }),
  };
}

export function createEnvDefines(generatedAtBuild: Record<string, unknown>): Record<string, string> {
  const defines: Record<string, string> = {};
  Object.keys(generatedAtBuild).forEach((key) => {
    defines[key] = JSON.stringify(generatedAtBuild[key]);
  });

  return defines;
}
