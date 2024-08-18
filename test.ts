import { RPCHandler } from "./types/rpc-handler";

async function test(ensName: string) {
  console.log("1. resolveAddress");
  const rpc = new RPCHandler({
    networkId: "1",
    // networkName: "ethereum-mainnet",
    networkName: null,
    // networkRpcs: null,
    networkRpcs: [{ url: "https://eth.drpc.org" }],
    autoStorage: false,
    cacheRefreshCycles: 3,
    // runtimeRpcs: null,
    runtimeRpcs: ["1__https://eth.drpc.org"],
    rpcTimeout: 600,
    // tracking: "none",
    proxySettings: { retryCount: 0, retryDelay: 1000, logTier: "verbose", logger: null, strictLogs: true },
  });
  console.log("2. resolveAddress");
  const provider = await rpc.getFastestRpcProvider();
  console.log("3. resolveAddress");
  return await provider.resolveName(ensName).catch((err) => {
    console.trace({ err });
    return null;
  });
}

test("mentlegen.eth")
  .then((r) => console.log(`done ${r}`))
  .catch((err) => console.error(err));
