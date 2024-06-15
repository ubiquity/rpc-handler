import { getNetworkId, getNetworkName, networkCurrencies, networkExplorers, networkIds, networkNames } from "../types/constants"
import { ChainId, ChainName, NativeToken, ChainIds, ChainNames } from "../types/handler";

describe("Constants", () => {

    beforeEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    })


    describe("getNetworkName", () => {
        it("should return the network name for a valid network ID", () => {
            const networkId = 80002;
            const expectedNetworkName = "amoy";
            const result = getNetworkName(networkId);
            expect(result).toBe(expectedNetworkName);
        });

        it("should return 'Unknown Network' for an unknown network ID", () => {
            const networkId = 12345;
            const expectedNetworkName = "Unknown Network";
            const result = getNetworkName(networkId as ChainId);
            expect(result).toBe(expectedNetworkName);
        });
    });

    describe("getNetworkId", () => {
        it("should return the network ID for a valid network name", () => {
            const networkName = "amoy";
            const expectedNetworkId = 80002;
            const result = getNetworkId(networkName);
            expect(result).toBe(expectedNetworkId);
        });

        it("should return 0 for an unknown network name", () => {
            const networkName = "unknown";
            const expectedNetworkId = -1;
            const result = getNetworkId(networkName as ChainName);
            expect(result).toBe(expectedNetworkId);
        });
    });

    describe("networkNames", () => {
        it("should contain a name for each network", () => {
            const networkIdValues = Object.values(networkIds)
                .sort((a, b) => a.localeCompare(b));
            const networkIdKeys = Object.keys(networkIds)
                .map(Number)
                .sort((a, b) => a - b)

            const networkNameKeys = Object.keys(networkNames)
                .sort((a, b) => a.localeCompare(b));
            const networkNameValues = Object.values(networkNames)
                .sort((a, b) => a - b);

            // keys of networkIds are the values of networkNames
            expect(networkNameKeys).toEqual(networkIdValues);
            // values of networkIds are the keys of networkNames
            expect(networkIdKeys).toEqual(networkNameValues);

            netIds.forEach((networkId) => {
                const networkName = networkIds[networkId];
                expect(networkName).toBe(expectedName[networkId]);
            });
        });
    });

    const netIds = [
        1, 100, 56, 80002, 137, 25
    ] as ChainId[];

    const expected = {
        1: "https://etherscan.io/",
        100: "https://gnosisscan.io/",
        56: "https://bscscan.com/",
        80002: "https://amoy.polygonscan.com/",
        137: "https://polygonscan.com/",
        25: "https://cronoscan.com/"
    } as Partial<Record<ChainId, string>>;

    const expectedName = {
        1: "ethereum",
        100: "xdai",
        56: "binance",
        80002: "amoy",
        137: "polygon",
        25: "cronos",
    } as Partial<Record<ChainId, string>>;

    const expectedNative = {
        1: { symbol: "ETH", decimals: 18 },
        100: { symbol: "XDAI", decimals: 18 },
        56: { symbol: "BNB", decimals: 18 },
        80002: { symbol: "MATIC", decimals: 18 },
        137: { symbol: "MATIC", decimals: 18 },
        25: { symbol: "CRO", decimals: 18 }
    } as Partial<Record<ChainId, NativeToken>>;


    describe("networkCurrencies", () => {
        it("should contain a currency for each network", () => {
            netIds.forEach((networkId) => {
                const result = networkCurrencies[networkId];
                const expectedCurrency = expectedNative[networkId] as NativeToken;
                expect(result).toEqual(expectedCurrency);
            });
        });
    });

    describe("networkExplorers", () => {
        it("should contain an explorer for each network", () => {
            netIds.forEach((networkId) => {
                const networkName = getNetworkName(networkId as ChainId);
                const result = networkExplorers[networkId];
                expect(result).toBe(expected[networkId]);
                expect(networkName).toBe(expectedName[networkId]);
            });
        });
    });

});