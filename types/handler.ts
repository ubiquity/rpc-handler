import { JsonRpcProvider } from "@ethersproject/providers";
import { networkCurrencies, networkExplorers, networkRpcs } from "./constants";
import { CHAINS_IDS, EXTRA_RPCS } from "./dynamic";
import { LogInterface, PrettyLogs, PrettyLogsWithOk } from "./logs";

export type BlockExplorer = {
  name: string;
  url: string;
  standard?: string;
  icon?: string;
};

export type ValidBlockData = {
  jsonrpc: string;
  id: number;
  result: {
    number: string;
    timestamp: string;
    hash: string;
  };
};

export type Token = {
  decimals: number;
  address: string;
  symbol: string;
};

export type NativeToken = {
  name: string;
  symbol: string;
  decimals: number;
};

export type HandlerInterface = {
  getProvider(): JsonRpcProvider | null;
  clearInstance(): void;
  getFastestRpcProvider(): Promise<JsonRpcProvider | null>;
  testRpcPerformance(): Promise<JsonRpcProvider | null>;
};

// This is log message prefix which can be used to identify the logs from this module
type ModuleName = "[RPCHandler Provider Proxy] - ";

type ProxySettings = {
  retryCount: number; // how many times we'll loop the list of RPCs retrying the request before failing
  retryDelay: number; // how long we'll wait before moving to the next RPC
  // eslint-disable-next-line @typescript-eslint/ban-types
  logTier: (PrettyLogsWithOk & {}) | null; // set to "none" for no logs, null will default to "error", "verbose" will log all
  logger: PrettyLogs | LogInterface | null; // null will default to PrettyLogs, otherwise pass in your own logger
  strictLogs: boolean; // true is default, only the specified logTier will be logged. false will log all logs.
  moduleName?: ModuleName | string; // this is the prefix for the logs
  disabled?: boolean;
};

export type HandlerConstructorConfig = {
  networkId: NetworkId;
  networkName: NetworkName | null;
  tracking?: Tracking; // "yes" | "limited" | "none", default is "yes". This is the data tracking status of the RPC provider
  networkRpcs: Rpc[] | null; // e.g "https://mainnet.infura.io/..."
  autoStorage: boolean | null; // browser only, will store in localStorage
  cacheRefreshCycles: number | null; // bad RPCs are excluded if they fail, this is how many cycles before they're re-tested
  runtimeRpcs: string[] | null; // e.g "<networkId>__https://mainnet.infura.io/..." > "1__https://mainnet.infura.io/..."
  rpcTimeout: number | null; // when the RPCs are tested they are raced, this is the max time to allow for a response
  proxySettings: ProxySettings; // settings for the proxy
};

export type NetworkRPCs = typeof networkRpcs;
export type NetworkCurrencies = typeof networkCurrencies;
export type NetworkExplorers = typeof networkExplorers;

// filtered NetworkId union
export type NetworkId = keyof typeof EXTRA_RPCS | "31337" | "1337";

// unfiltered Record<NetworkId, NetworkName>
type ChainsUnfiltered = {
  -readonly [K in keyof typeof CHAINS_IDS]: (typeof CHAINS_IDS)[K];
};

// filtered NetworkName union
export type NetworkName = ChainsUnfiltered[NetworkId] | "anvil" | "hardhat";

export type Tracking = "yes" | "limited" | "none";

export type Rpc = {
  url: string;
  tracking?: Tracking;
  trackingDetails?: string;
  isOpenSource?: boolean;
};

export function getRpcUrls(rpcs: Rpc[]) {
  const urls: string[] = [];
  rpcs.forEach((rpc) => {
    if (typeof rpc == "string") {
      urls.push(rpc);
    } else {
      urls.push(rpc.url);
    }
  });
  return urls;
}
