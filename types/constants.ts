import { BlockExplorer, NetworkId, NetworkName, NativeToken, Rpc } from "./handler";
import { CHAINS_IDS, EXTRA_RPCS, NETWORK_CURRENCIES, NETWORK_EXPLORERS, NETWORK_FAUCETS } from "./dynamic";

export declare const chainIDList: Record<string, string>;
export declare const extraRpcs: Record<ChainId, { rpcs: Rpc[] }>;

export type ChainId<T extends string | number = number> = T extends keyof typeof chainIDList ? (typeof chainIDList)[T] : T;

export const permit2Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
export const nftAddress = "0xAa1bfC0e51969415d64d6dE74f27CDa0587e645b";
export const LOCAL_HOST = "http://127.0.0.1:8545";

const networkIds: Record<NetworkId, NetworkName> = {
  ...{ ...CHAINS_IDS }, // removing readonly
  31337: "anvil",
  1337: "hardhat",
};

const networkNames = Object.fromEntries(
  Object.entries(networkIds).map(([key, value]) => {
    return [value, key];
  })
) as Record<NetworkName, NetworkId>;

Reflect.deleteProperty(networkNames, "geth-testnet"); // 1337
Reflect.deleteProperty(networkNames, "gochain-testnet"); // 31337

const networkRpcs = Object.fromEntries(
  Object.entries(networkNames).map(([, value]) => {
    const chainRpcs = EXTRA_RPCS[value as unknown as keyof typeof EXTRA_RPCS];
    return [value, { rpcs: chainRpcs }];
  })
) as Record<NetworkId, { rpcs: Rpc[] }>;

const networkExplorers = Object.fromEntries(
  Object.entries(networkNames).map(([, value]) => {
    const chainExplorers: BlockExplorer[] = NETWORK_EXPLORERS[value as unknown as keyof typeof NETWORK_EXPLORERS];
    return [value, chainExplorers];
  })
) as Record<NetworkId, BlockExplorer[]>;

const networkCurrencies: Record<NetworkId, NativeToken> = Object.fromEntries(
  Object.entries(NETWORK_CURRENCIES).map(([chainId, currency]) => {
    return [chainId, currency as NativeToken];
  })
) as Record<NetworkId, NativeToken>;

function getNetworkName(networkId: NetworkId) {
  const networkName = networkIds[networkId];
  if (!networkName) {
    console.error(`Unknown network ID: ${networkId}`);
  }
  return networkName ?? "Unknown Network";
}

function getNetworkId(networkName: NetworkName) {
  const networkId = networkNames[networkName];
  if (!networkId) {
    console.error(`Unknown network name: ${networkName}`);
  }
  return networkId ?? -1;
}

export { networkIds, networkNames, networkRpcs, networkCurrencies, networkExplorers, getNetworkName, getNetworkId, NETWORK_FAUCETS };
