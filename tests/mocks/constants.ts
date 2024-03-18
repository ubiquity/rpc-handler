import { ChainNames, NativeToken, Token } from "./handler";

export declare const chainIDList: Record<string, string>;
export declare const extraRpcs: Record<ChainId, string[]>;

export type ChainId<T extends string | number = number> = T extends keyof typeof chainIDList ? (typeof chainIDList)[T] : T;

export const permit2Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
export const nftAddress = "0xAa1bfC0e51969415d64d6dE74f27CDa0587e645b";
export const LOCAL_HOST = "http://127.0.0.1:8545";

export const networkIds: Record<ChainNames[keyof ChainNames], ChainId> = Object.fromEntries(
  Object.entries(chainIDList).map(([id, name]) => {
    const chainId = parseInt(id);
    const chain = name.charAt(0).toUpperCase() + name.slice(1);
    return [chain, chainId];
  })
);

export const networkNames: ChainNames = Object.fromEntries(
  Object.entries(networkIds).map(([name, id]) => {
    const chainName = name.charAt(0).toUpperCase() + name.slice(1);
    return [id, chainName];
  })
);

export const networkRpcs: Record<ChainId, string[]> = Object.fromEntries(
  Object.entries(networkIds).map(([, value]) => {
    const chainRpcs = extraRpcs[value] || [];
    return [value, chainRpcs];
  })
);

export const tokens: Record<ChainId, Record<string, Token>> = {
  [networkIds.Mainnet]: {
    DAI: {
      address: "0x6b175474e89094c44da98b954eedeac495271d0f",
      decimals: 18,
    },
  },
  [networkIds.Gnosis]: {
    WXDAI: {
      address: "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d",
      decimals: 18,
    },
  },
};

export const networkCurrencies: Record<ChainId, NativeToken> = {
  [networkIds.Mainnet]: { symbol: "ETH", decimals: 18 },
  [networkIds.Goerli]: { symbol: "GoerliETH", decimals: 18 },
  [networkIds.Gnosis]: { symbol: "XDAI", decimals: 18 },
  [networkIds.Anvil]: { symbol: "XDAI", decimals: 18 },
};

export const networkExplorers: Record<ChainId, string> = {
  [networkIds.Mainnet]: "https://etherscan.io",
  [networkIds.Goerli]: "https://goerli.etherscan.io",
  [networkIds.Gnosis]: "https://gnosisscan.io",
  [networkIds.Anvil]: "https://gnosisscan.io",
};

export function getNetworkName(networkId?: number) {
  const networkName = networkNames[networkId ?? 0];
  if (!networkName) {
    console.error(`Unknown network ID: ${networkId}`);
  }
  return networkName ?? "Unknown Network";
}
