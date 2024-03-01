import { JsonRpcProvider } from "@ethersproject/providers";
import { HandlerInterface } from "handler";
export declare class RPCHandler implements HandlerInterface {
  private static _instance;
  private _provider;
  private _networkId;
  private _env;
  private _cacheRefreshCycles;
  private _refreshLatencies;
  private _runtimeRpcs;
  private _latencies;
  constructor(networkId: number, cacheRefreshCycles?: number);
  private _initialize;
  static getInstance(networkId: number, cacheRefreshCycles?: number): RPCHandler;
  clearInstance(): void;
  getProvider(): JsonRpcProvider;
  getFastestRpcProvider(networkId?: number): Promise<JsonRpcProvider>;
  testRpcPerformance(networkId: number): Promise<JsonRpcProvider>;
  private _testRpcPerformance;
}
