import ChainIds from "../lib/chainlist/constants/chainIds.json";

export type ChainId<T extends string | number = number> = T extends keyof typeof ChainIds ? (typeof ChainIds)[T] : T;

export type ChainNames<TChainID extends PropertyKey = ChainId> = {
  [key in TChainID]: string;
};

export declare const extraRpcs: Record<ChainId, string[]>;

export const networkIds: Record<ChainNames[keyof ChainNames], ChainId> = {
  Mainnet: 1,
  Goerli: 5,
  Gnosis: 100,
  Anvil: 31337,
};

export type Token = {
  address: string;
  decimals: number;
};

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

export const networkCurrencies: Record<ChainId, { symbol: string; decimals: number }> = {
  [networkIds.Mainnet]: { symbol: "ETH", decimals: 18 },
  [networkIds.Goerli]: { symbol: "GoerliETH", decimals: 18 },
  [networkIds.Gnosis]: { symbol: "XDAI", decimals: 18 },
  [networkIds.Anvil]: { symbol: "XDAI", decimals: 18 },
};

export function getNetworkName(networkId?: number) {
  const networkName = networkNames[networkId as keyof typeof networkNames];
  if (!networkName) {
    console.error(`Unknown network ID: ${networkId}`);
  }
  return networkName ?? "Unknown Network";
}

export const permit2Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
export const nftAddress = "0xAa1bfC0e51969415d64d6dE74f27CDa0587e645b";
export const LOCAL_HOST = "http://127.0.0.1:8545";

export const networkExplorers: Record<ChainId, string> = {
  [networkIds.Mainnet]: "https://etherscan.io",
  [networkIds.Goerli]: "https://goerli.etherscan.io",
  [networkIds.Gnosis]: "https://gnosisscan.io",
  [networkIds.Anvil]: "https://gnosisscan.io",
};

export const networkRpcs: Record<ChainId, string[]> = {
  [networkIds.Mainnet]: [...(extraRpcs[networkIds.Mainnet] || [])],
  [networkIds.Goerli]: [...(extraRpcs[networkIds.Goerli] || [])],
  [networkIds.Gnosis]: [...(extraRpcs[networkIds.Gnosis] || [])],
  [networkIds.Anvil]: [LOCAL_HOST],
};

export const networkNames: ChainNames = {
  [networkIds.Mainnet]: "Ethereum Mainnet",
  [networkIds.Goerli]: "Goerli Testnet",
  [networkIds.Gnosis]: "Gnosis Chain",
  [networkIds.Anvil]: LOCAL_HOST,
};
