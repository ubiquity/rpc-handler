export type RpcType =
  | string // if string then it is the official rpc of the chain
  | {
      url: string;
      tracking: "yes" | "limited" | "none";
      trackingDetails: string;
    };

export function getRpcUrls(rpcs: RpcType[]) {
  console.log("rpcs here", rpcs);
  console.log("rpcs type", typeof rpcs);
  let urls: string[] = [];
  rpcs.forEach((rpc) => {
    if (typeof rpc == "string") {
      urls.push(rpc);
    } else {
      urls.push(rpc.url);
    }
  });
  return urls;
}
