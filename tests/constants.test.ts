import { NetworkId, NetworkName, NativeToken } from "../types/handler";

import {
  getNetworkId,
  getNetworkName,
  networkCurrencies,
  networkExplorers,
  networkIds,
  networkNames,
  getNetworkCurrency,
  getNetworkData,
  getNetworkExplorer,
} from "../types/constants";

describe("Constants", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe("getNetworkName", () => {
    it("should return the network name for a valid network ID", () => {
      const networkId = "80002";
      const expectedNetworkName = "amoy";
      const result = getNetworkName(networkId);
      expect(result).toBe(expectedNetworkName);
    });

    it("should return 'Unknown Network' for an unknown network ID", () => {
      const networkId = Number.MAX_SAFE_INTEGER;
      const expectedNetworkName = "Unknown Network";
      const result = getNetworkName(networkId as unknown as NetworkId);
      expect(result).toBe(expectedNetworkName);
    });
  });

  describe("getNetworkId", () => {
    it("should return the network ID for a valid network name", () => {
      const networkName = "amoy";
      const expectedNetworkId = "80002";
      const result = getNetworkId(networkName);
      expect(result).toBe(expectedNetworkId);
    });

    it("should return -1 for an unknown network name", () => {
      const networkName = "unknown";
      const expectedNetworkId = -1;
      const result = getNetworkId(networkName as NetworkName);
      expect(result).toBe(expectedNetworkId);
    });

    it("should work with getNetworkData", () => {
      const networkName = "amoy";
      const expectedNetworkId = "80002";
      const result = getNetworkData(expectedNetworkId);
      expect(result.name).toBe(networkName);
    });
  });

  describe("networkNames", () => {
    it("should contain a name for each network", () => {
      const networkIdValues = Object.values(networkIds).sort((a, b) => a.localeCompare(b));

      const networkNameKeys = Object.keys(networkNames).sort((a, b) => a.localeCompare(b));

      // keys of networkIds are the values of networkNames
      expect(networkIdValues).toEqual(networkNameKeys);

      netIds.forEach((networkId) => {
        const networkName = networkIds[networkId];
        expect(networkName).toBe(expectedName[networkId]);
      });
    });

    it("should work with getNetworkName", () => {
      netIds.forEach((networkId) => {
        const networkName = getNetworkName(networkId);
        expect(networkName).toBe(expectedName[networkId]);
      });
    });
  });

  const netIds = ["1", "100", "56", "80002", "137", "25"] as NetworkId[];

  const expected = {
    "1": "https://etherscan.io",
    "100": "https://gnosisscan.io",
    "56": "https://bscscan.com",
    "80002": "https://www.oklink.com/amoy",
    "137": "https://polygonscan.com",
    "25": "https://explorer.cronos.org",
  } as Partial<Record<NetworkId, string>>;

  const expectedName = {
    "1": "ethereum-mainnet",
    "100": "gnosis",
    "56": "bnb-smart-chain-mainnet",
    "80002": "amoy",
    "137": "polygon-mainnet",
    "25": "cronos-mainnet",
  } as Partial<Record<NetworkId, string>>;

  const expectedNative = {
    "1": { symbol: "ETH", decimals: 18, name: "Ether" },
    "100": { symbol: "XDAI", decimals: 18, name: "xDAI" },
    "56": { symbol: "BNB", decimals: 18, name: "BNB Chain Native Token" },
    "80002": { symbol: "POL", decimals: 18, name: "POL" },
    "137": { symbol: "POL", decimals: 18, name: "POL" },
    "25": { symbol: "CRO", decimals: 18, name: "Cronos" },
  } as Partial<Record<NetworkId, NativeToken>>;

  describe("networkCurrencies", () => {
    it("should contain a currency for each network", () => {
      netIds.forEach((networkId) => {
        const result = networkCurrencies[networkId];
        const expectedCurrency = expectedNative[networkId] as NativeToken;
        expect(result).toEqual(expectedCurrency);
      });
    });

    it("should work with getNetworkCurrency", () => {
      netIds.forEach((networkId) => {
        const result = getNetworkCurrency(networkId);
        const expectedCurrency = expectedNative[networkId] as NativeToken;
        expect(result).toEqual(expectedCurrency);
      });
    });
  });

  describe("networkExplorers", () => {
    it("should contain an explorer for each network", () => {
      netIds.forEach((networkId) => {
        const result = networkExplorers[networkId];
        const explorerUrls = result.map(({ url }) => url);
        const expectedExplorer = expected[networkId];
        expect(explorerUrls).toContain(expectedExplorer);
      });
    });

    it("should work with getNetworkExplorer", () => {
      netIds.forEach((networkId) => {
        const result = getNetworkExplorer(networkId);
        const explorerUrls = result.map(({ url }) => url);
        const expectedExplorer = expected[networkId];
        expect(explorerUrls).toContain(expectedExplorer);
      });
    });
  });
});
