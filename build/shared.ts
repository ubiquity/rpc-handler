export function prepareExtraRpcs(chainlist) {
  const extraRpcs: Record<string, string[]> = {};
  // this flattens all the rpcs into a single object, with key names that match the networkIds. The arrays are just of URLs per network ID.
  Object.keys(chainlist).forEach((networkId) => {
    const officialUrls = chainlist[networkId].rpcs.filter((rpc) => typeof rpc === "string");
    const extraUrls: string[] = chainlist[networkId].rpcs.filter((rpc) => rpc.url !== undefined && rpc.tracking === "none").map((rpc) => rpc.url);
    extraRpcs[networkId] = [...officialUrls, ...extraUrls].filter((rpc) => rpc.startsWith("https://"));
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
