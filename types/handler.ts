import { JsonRpcProvider } from "@ethersproject/providers";
import { networkCurrencies, networkExplorers, networkRpcs } from "./constants";
import { chainIds, networks } from "./dynamic";

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
  -readonly [Key in keyof typeof chainIds]: typeof chainIds[Key]
}
export type ChainNames = {
  -readonly [Key in keyof typeof networks]: typeof networks[Key]
}

export type ChainName = ChainIds[keyof ChainIds] |
  "amoy" |
  "sepolia" |
  "telos-testnet" |
  "chiado" |
  "fantom-testnet" |
  "bsc-testnet" |
  "sepolia-optimism" |
  "hekla" |
  "sepolia-base" |
  "fuji" |
  "bittorrent" |
  "donau" |
  "polygon_zkevm_testnet" |
  "kroma" |
  "kroma-sepolia" |
  "linea-sepolia" |
  "scroll" |
  "scroll-sepolia" |
  "taiko" |
  "cronos-testnet" |
  "blast" |
  "blast-testnet" |
  "anvil" |
  "hardhat" |
  (string & {})

export type ChainId = ChainNames[keyof ChainNames] |
  80002 |
  11155111 |
  41 |
  10200 |
  4002 |
  97 |
  11155420 |
  167009 |
  84532 |
  43113 |
  199 |
  1028 |
  1442 |
  255 |
  2358 |
  59141 |
  534352 |
  534351 |
  167000 |
  338 |
  23888 |
  238 |
  31337 |
  1337 |
  (number & {})

