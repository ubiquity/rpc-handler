import { JsonRpcProvider } from "@ethersproject/providers";
import { networkCurrencies, networkExplorers, networkRpcs } from "../../types/constants";
import { CHAINS_IDS, EXTRA_RPCS } from "../../types/dynamic";

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
  networkId: ChainId;
  networkName: ChainName | null;
  networkRpcs: string[] | null;
  autoStorage: boolean | null;
  cacheRefreshCycles: number | null;
  runtimeRpcs: string[] | null;
  rpcTimeout: number | null;
};

export type NetworkRPCs = typeof networkRpcs;
export type NetworkCurrencies = typeof networkCurrencies;
export type NetworkExplorers = typeof networkExplorers;

// filtered chainId union
export type ChainId = keyof typeof EXTRA_RPCS | "31337" | "1337";

// unfiltered Record<ChainID, ChainName>
type ChainsUnfiltered = {
  -readonly [K in keyof typeof CHAINS_IDS]: (typeof CHAINS_IDS)[K];
};

// filtered ChainName union
export type ChainName = ChainsUnfiltered[ChainId] | "anvil" | "hardhat";
