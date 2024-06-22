import { JsonRpcProvider } from "@ethersproject/providers";
import { networkCurrencies, networkExplorers, networkRpcs } from "./constants";
import { RpcType, Tracking } from "./shared";
import { CHAINS_IDS, EXTRA_RPCS } from "./dynamic";

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

export type HandlerConstructorConfig = {
  networkId: NetworkId;
  networkName: NetworkName | null;
  networkRpcs: RpcType[] | null;
  autoStorage: boolean | null;
  cacheRefreshCycles: number | null;
  runtimeRpcs: string[] | null;
  rpcTimeout: number | null;
  tracking?: Tracking;
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
