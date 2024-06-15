import { ChainId, ChainName, NativeToken } from "./handler";
import { chainIds, networks } from "./dynamic";

export const permit2Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
export const nftAddress = "0xAa1bfC0e51969415d64d6dE74f27CDa0587e645b";
export const LOCAL_HOST = "http://127.0.0.1:8545";

declare const extraRpcs: Record<ChainId, string[]>;

export const networkRpcs: Record<ChainId, string[]> = extraRpcs;
export const networkIds: Record<ChainId, ChainName> = { ...chainIds };
export const networkNames: Record<ChainName, ChainId> = { ...networks };

export const networkCurrencies: Partial<Record<ChainId, NativeToken>> = {
  [networkNames.ethereum]: { symbol: "ETH", decimals: 18 },
  [networkNames.xdai]: { symbol: "XDAI", decimals: 18 },
  // [networkNames.Anvil]: { symbol: "XDAI", decimals: 18 },
  // [networkNames.Goerli]: { symbol: "GoerliETH", decimals: 18 },
};

export const networkExplorers: Partial<Record<ChainId, string>> = {
  [networkNames.ethereum]: "https://etherscan.io",
  [networkNames.xdai]: "https://gnosisscan.io",
  // [networkNames.Goerli]: "https://goerli.etherscan.io",
  // [networkNames.Anvil]: "https://gnosisscan.io",
};

export function getNetworkName(networkId: ChainId) {
  const networkName = networkIds[networkId];
  if (!networkName) {
    console.error(`Unknown network ID: ${networkId}`);
  }
  return networkName ?? "Unknown Network";
}

export function getNetworkId(networkName: ChainName) {
  const networkId = networkNames[networkName];
  if (!networkId) {
    console.error(`Unknown network name: ${networkName}`);
  }
  return networkId ?? 0;
}

// export const tokens: Record<ChainId, Record<Token["symbol"], Token>> = {
//   [networkNames.ethereum]: {
//     DAI: {
//       address: "0x6b175474e89094c44da98b954eedeac495271d0f",
//       decimals: 18,
//       symbol: "DAI",
//     },
//   },
//   [networkNames.xdai]: {
//     WXDAI: {
//       address: "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d",
//       decimals: 18,
//       symbol: "WXDAI",
//     },
//   },
// };