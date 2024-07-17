import {
  NetworkId,
  NetworkName,
  HandlerConstructorConfig,
  HandlerInterface,
  NativeToken,
  NetworkCurrencies,
  NetworkExplorers,
  NetworkRPCs,
  Token,
  ValidBlockData,
} from "./types/handler";

import {
  LOCAL_HOST,
  networkCurrencies,
  networkExplorers,
  networkIds,
  networkNames,
  networkRpcs,
  nftAddress,
  permit2Address,
  getNetworkId,
  getNetworkFaucets,
  getNetworkExplorer,
  getNetworkName,
  getNetworkRpcs,
  getNetworkCurrency,
  getNetworkData,
} from "./types/constants";

import { RPCHandler } from "./types/rpc-handler";
import { PrettyLogs } from "./types/logs";
import { StorageService } from "./types/storage-service";
import { RPCService } from "./types/rpc-service";

export { LOCAL_HOST, networkCurrencies, networkExplorers, networkIds, networkNames, networkRpcs, nftAddress, permit2Address };
export { getNetworkId, getNetworkFaucets, getNetworkExplorer, getNetworkName, getNetworkRpcs, getNetworkCurrency, getNetworkData };

export type {
  NetworkId,
  NetworkName,
  HandlerConstructorConfig,
  HandlerInterface,
  NativeToken,
  NetworkCurrencies,
  NetworkExplorers,
  NetworkRPCs,
  Token,
  ValidBlockData,
};
export { RPCHandler, PrettyLogs, StorageService, RPCService };
