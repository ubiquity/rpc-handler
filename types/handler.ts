import { JsonRpcProvider } from "@ethersproject/providers";
import { networkCurrencies, networkExplorers, networkRpcs } from "./constants";
import { CHAINS_IDS, NETWORKS } from "./dynamic";

export type BlockExplorer = {
  name: string;
  url: string;
  standard?: string;
  icon?: string;
}

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

export type ChainIds = {
  -readonly [Key in keyof typeof CHAINS_IDS]: typeof CHAINS_IDS[Key]
}
export type ChainNames = {
  -readonly [Key in keyof typeof NETWORKS]: typeof NETWORKS[Key]
}

export type ChainName = ChainIds[keyof ChainIds] |
  "anvil" |
  "hardhat"

export type ChainId = ChainNames[keyof ChainNames] |
  31337 |
  1337

