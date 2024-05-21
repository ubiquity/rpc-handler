import { JsonRpcProvider } from "@ethersproject/providers";
import { ChainId, networkCurrencies, networkExplorers, networkIds, networkNames, networkRpcs, tokens } from "../../types/constants";

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
};
export type NativeToken = {
  symbol: string;
  decimals: number;
};
export type HandlerInterface = {
  getProvider(): JsonRpcProvider | undefined;
  clearInstance(): void;
  getFastestRpcProvider(): Promise<JsonRpcProvider | undefined>;
  testRpcPerformance(): Promise<JsonRpcProvider | undefined>;
};
export type HandlerConstructorConfig = {
  networkId: number;
  networkName: string | null;
  networkRpcs: string[] | null;
  autoStorage: boolean | null;
  cacheRefreshCycles: number | null;
  runtimeRpcs: string[] | null;
  rpcTimeout: number | null;
};

export type NetworkRPCs = typeof networkRpcs;
export type NetworkNames = typeof networkNames;
export type NetworkCurrencies = typeof networkCurrencies;
export type Tokens = typeof tokens;
export type NetworkExplorers = typeof networkExplorers;
export type NetworkIds = typeof networkIds;
export type { ChainId };
export type ChainNames<TChainID extends PropertyKey = ChainId> = {
  [key in TChainID]: string;
};
