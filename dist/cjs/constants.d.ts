export declare const extraRpcs: Record<number, string[]>;
export declare enum NetworkIds {
  Mainnet = 1,
  Goerli = 5,
  Gnosis = 100,
  Anvil = 31337,
}
export declare enum Tokens {
  DAI = "0x6b175474e89094c44da98b954eedeac495271d0f",
  WXDAI = "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d",
}
export declare const LOCAL_HOST = "http://127.0.0.1:8545";
export declare const networkNames: {
  1: string;
  5: string;
  100: string;
  31337: string;
};
export declare const networkCurrencies: Record<number, object>;
export declare function getNetworkName(networkId?: number): string;
export declare const networkExplorers: Record<number, string>;
export declare const networkRpcs: Record<number, string[]>;
export declare const permit2Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
export declare const nftAddress = "0xAa1bfC0e51969415d64d6dE74f27CDa0587e645b";
