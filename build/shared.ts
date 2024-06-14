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
