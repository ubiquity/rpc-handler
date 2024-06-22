export type Tracking = "yes" | "limited" | "none";

export type RpcType =
  | string // if string then it is the official rpc of the chain
  | RpcDetailed;

export type RpcDetailed = {
  url: string;
  tracking: Tracking;
  trackingDetails: string;
  isOpenSource: boolean;
};

export function getRpcUrls(rpcs: RpcType[]) {
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
