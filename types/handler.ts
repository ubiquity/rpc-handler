import { JsonRpcProvider } from "@ethersproject/providers";
import { ChainId, networkCurrencies, networkExplorers, networkIds, networkNames, networkRpcs, networkRpcsOriginal, tokens } from "./constants";
import { RpcType } from "./shared";

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
  networkId: number;
  networkName: string | null;
  networkRpcs: RpcType[] | null;
  autoStorage: boolean | null;
  cacheRefreshCycles: number | null;
  runtimeRpcs: string[] | null;
  rpcTimeout: number | null;
  tracking: "yes" | "limited" | "none";
  protocol: "all" | "https" | "wss";
};

export type NetworkRPCs = typeof networkRpcs;
export type NetworkRPCsOriginal = typeof networkRpcsOriginal;
export type NetworkNames = typeof networkNames;
export type NetworkCurrencies = typeof networkCurrencies;
export type Tokens = typeof tokens;
export type NetworkExplorers = typeof networkExplorers;
export type NetworkIds = typeof networkIds;
export type { ChainId };

export type ChainNames<TChainID extends PropertyKey = ChainId> = {
  [key in TChainID]: string;
};
