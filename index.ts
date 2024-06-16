export default async function getRPCHandler() {
  let modulePath;
  if (typeof window !== "undefined") {
    modulePath = "./esm/index.js";
  } else {
    modulePath = "./cjs/index.js";
  }

  const { RPCHandler } = await import(modulePath);

  return RPCHandler;
}

import {
  ChainId,
  ChainName,
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
  getNetworkName,
  networkCurrencies,
  networkExplorers,
  networkIds,
  networkNames,
  networkRpcs,
  nftAddress,
  permit2Address,
  getNetworkId,
} from "./types/constants";

import { RPCHandler } from "./types/rpc-handler";

export { LOCAL_HOST, getNetworkName, getNetworkId, networkCurrencies, networkExplorers, networkIds, networkNames, networkRpcs, nftAddress, permit2Address };

export type {
  ChainId,
  ChainName,
  HandlerConstructorConfig,
  HandlerInterface,
  NativeToken,
  NetworkCurrencies,
  NetworkExplorers,
  NetworkRPCs,
  Token,
  ValidBlockData,
};
export { RPCHandler };
