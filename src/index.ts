import { nftAddress, permit2Address, tokens, networkCurrencies, networkExplorers, networkRpcs, getNetworkName, networkNames, networkIds } from "./constants";
import type {
  HandlerConstructorConfig,
  HandlerInterface,
  ChainNames,
  NativeToken,
  NetworkCurrencies,
  NetworkExplorers,
  NetworkIds,
  NetworkNames,
  NetworkRPCs,
  ChainId,
} from "./handler";

import { RPCHandler } from "./rpc-handler";

export type {
  ChainNames,
  NativeToken,
  NetworkCurrencies,
  NetworkExplorers,
  NetworkIds,
  NetworkNames,
  NetworkRPCs,
  HandlerConstructorConfig,
  HandlerInterface,
  ChainId,
  RPCHandler,
};

export { networkIds, networkNames, networkCurrencies, networkExplorers, tokens, nftAddress, permit2Address, getNetworkName, networkRpcs };
