export declare const extraRpcs: Record<number, string[]>;

export const networkIds: Record<string, number> = {
  Mainnet: 1,
  Goerli: 5,
  Gnosis: 100,
  Anvil: 31337,
};

export type Token = {
  address: string;
  decimals: number;
};

export const tokens: Record<number, Record<string, Token>> = {
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

export const LOCAL_HOST = "http://127.0.0.1:8545";

export const networkNames = {
  [networkIds.Mainnet]: "Ethereum Mainnet",
  [networkIds.Goerli]: "Goerli Testnet",
  [networkIds.Gnosis]: "Gnosis Chain",
  [networkIds.Anvil]: LOCAL_HOST,
};

export const networkCurrencies: Record<number, { symbol: string; decimals: number }> = {
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

export const networkExplorers: Record<number, string> = {
  [networkIds.Mainnet]: "https://etherscan.io",
  [networkIds.Goerli]: "https://goerli.etherscan.io",
  [networkIds.Gnosis]: "https://gnosisscan.io",
  [networkIds.Anvil]: "https://gnosisscan.io",
};

export const networkRpcs: Record<number, string[]> = {
  [networkIds.Mainnet]: [...(extraRpcs[networkIds.Mainnet] || [])],
  [networkIds.Goerli]: [...(extraRpcs[networkIds.Goerli] || [])],
  [networkIds.Gnosis]: [...(extraRpcs[networkIds.Gnosis] || [])],
  [networkIds.Anvil]: [LOCAL_HOST],
};

export const permit2Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
export const nftAddress = "0xAa1bfC0e51969415d64d6dE74f27CDa0587e645b";
