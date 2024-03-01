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
  getFastestRpcProvider(networkId?: number): Promise<JsonRpcProvider>;
  testRpcPerformance(networkId: number): Promise<JsonRpcProvider>;
};
