import { ChainId, ChainIds, ChainName, NativeToken } from "./handler";
import { chainIds, networks } from "./dynamic";

export const permit2Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
export const nftAddress = "0xAa1bfC0e51969415d64d6dE74f27CDa0587e645b";
export const LOCAL_HOST = "http://127.0.0.1:8545";

declare const extraRpcs: Record<ChainId, string[]>;

export const networkRpcs: Record<ChainId, string[]> = extraRpcs;
export const networkIds: Record<ChainId, ChainName> = {
  ...{ ...chainIds }, // removing readonly
  80002: "amoy",
  11155111: "sepolia",
  41: "telos-testnet",
  10200: "chiado",
  4002: "fantom-testnet",
  97: "bsc-testnet",
  11155420: "sepolia-optimism",
  167009: "hekla",
  84532: "sepolia-base",
  43113: "fuji",
  199: "bittorrent",
  1028: "donau",
  1442: "polygon_zkevm_testnet",
  255: "kroma",
  2358: "kroma-sepolia",
  59141: "linea-sepolia",
  534351: "scroll-sepolia",
  534352: "scroll",
  167000: "taiko",
  338: "cronos-testnet",
};

export const networkNames: Record<ChainName, ChainId> = {
  ...{ ...networks }, // removing readonly
  "amoy": 80002,
  "sepolia": 11155111,
  "telos-testnet": 41,
  "chiado": 10200,
  "fantom-testnet": 4002,
  "bsc-testnet": 97,
  "sepolia-optimism": 11155420,
  "hekla": 167009,
  "sepolia-base": 84532,
  "fuji": 43113,
  bittorrent: 199,
  donau: 1028,
  polygon_zkevm_testnet: 1442,
  kroma: 255,
  "kroma-sepolia": 2358,
  "linea-sepolia": 59141,
  "scroll-sepolia": 534351,
  "scroll": 534352,
  "taiko": 167000,
  "cronos-testnet": 338,
};

export const networkExplorers: Partial<Record<ChainId, string>> = {
  [networkNames.ethereum]: "https://etherscan.io",
  [networkNames.xdai]: "https://gnosisscan.io",
  [networkNames.arbitrum]: "https://arbiscan.io/",
  [networkNames.binance]: "https://bscscan.com",
  [networkNames.polygon]: "https://polygonscan.com",
  [networkNames.avalanche]: "https://snowtrace.io/",
  [networkNames.blast]: "https://testnet.blastscan.io/",
  [networkNames.optimism]: "hhttps://optimistic.etherscan.io/",
  [networkNames.cronos]: "https://cronoscan.com/",
  [networkNames.celo]: "https://celoscan.io/",
  [networkNames.taiko]: "https://taikoscan.io/",
  [networkNames.base]: "https://basescan.org/",
  [networkNames.fantom]: "https://ftmscan.com/",
  [networkNames.heco]: "https://hecoinfo.com/",
  [networkNames.polygon_zkevm]: "https://zkevm.polygonscan.com/",
  [networkNames.bittorrent]: "https://bttcscan.com/",
  [networkNames.kroma]: "https://kromascan.com/",
  [networkNames.linea]: "https://lineascan.build/",
  [networkNames.moonbeam]: "https://moonbeam.moonscan.io/",
  [networkNames.moonriver]: "https://moonriver.moonscan.io/",
  [networkNames.arbitrum_nova]: "https://nova.arbiscan.io/",
  [networkNames.scroll]: "https://scrollscan.com/",
  [networkNames.taiko]: "https://taikoscan.io/",


  // testnets
  [networkNames.scroll_sepolia]: "https://sepolia.scrollscan.com/",
  [networkNames["linea-sepolia"]]: "https://sepolia.lineascan.build/",
  [networkNames.polygon_zkevm_testnet]: "https://cardona-zkevm.polygonscan.com/",
  [networkNames["kroma-sepolia"]]: "https://sepolia-kromascan.com/",
  [networkNames.fuji]: "https://testnet.snowtrace.io/",
  [networkNames.amoy]: "https://amoy.polygonscan.com/",
  [networkNames.sepolia]: "https://sepolia.etherscan.io/",
  [networkNames["telos-testnet"]]: "https://testnet.teloscan.io/",
  [networkNames.chiado]: "https://gnosis-chiado.blockscout.com/",
  [networkNames["fantom-testnet"]]: "https://testnet.ftmscan.com/",
  [networkNames["bsc-testnet"]]: "https://testnet.bscscan.com/",
  [networkNames["sepolia-optimism"]]: "https://sepolia-optimism.etherscan.io/",
  [networkNames.hekla]: "https://explorer.hekla.taiko.xyz/",
  [networkNames["sepolia-base"]]: "https://sepolia.basescan.org/",
  [networkNames["fantom-testnet"]]: "https://testnet.ftmscan.com/",
  [networkNames.donau]: "https://testnet.bttcscan.com/",
  [networkNames["cronos-testnet"]]: "https://explorer.cronos.org/testnet/",
  [networkNames["polygon_zkevm_testnet"]]: "https://testnet-zkevm.polygonscan.com/",
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

// export const networkCurrencies: Record<ChainId, NativeToken> = {
//   [networkNames.ethereum]: { symbol: "ETH", decimals: 18 },
//   [networkNames.xdai]: { symbol: "XDAI", decimals: 18 },
//   // [networkNames.Anvil]: { symbol: "XDAI", decimals: 18 },
//   // [networkNames.Goerli]: { symbol: "GoerliETH", decimals: 18 },
// };

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