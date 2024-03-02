import { JsonRpcProvider } from "@ethersproject/providers";

export type ValidBlockData = {
  jsonrpc: string;
  id: number;
  result: {
    number: string;
    timestamp: string;
    hash: string;
  };
};

export type HandlerInterface = {
  getProvider(): JsonRpcProvider;
  clearInstance(): void;
  getFastestRpcProvider(networkId?: number, autoStorage?: boolean): Promise<JsonRpcProvider>;
  testRpcPerformance(networkId: number, autoStorage?: boolean): Promise<JsonRpcProvider>;
};

export type HandlerConstructorConfig = {
  networkIds?: {
    [network: string]: number;
  };
  networkNames?: {
    [network: number]: string;
  };
  networkCurrencies?: {
    [network: number]: {
      symbol: string;
      decimals: number;
    };
  };
  networkExplorers?: {
    [network: number]: string;
  };
  networkRpcs?: {
    [network: number]: string[];
  };
  tokens?: {
    [network: number]: {
      [token: string]: {
        address: string;
        decimals: number;
      };
    };
  };
  autoStorage?: boolean;
  cacheRefreshCycles?: number;
  runtimeRpcs?: string[];
};
