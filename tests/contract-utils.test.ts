import { beforeEach, describe, expect, it, mock, Mock } from "bun:test";
import type { Address, Hex } from "viem"; // Import Abi type
import { encodeFunctionResult } from "viem";
import { readContract } from "../src/contract-utils.ts";
import { Permit2RpcManager } from "../src/permit2-rpc-manager.ts";

// Example ABI for testing basic types
const testAbi = [
  { name: "getValue", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "getAddress", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

// Standard ERC20 ABI subset for DAI test
const erc20Abi = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
] as const;

describe("readContract", () => {
  let mockRpcManager: Permit2RpcManager;
  let mockSendFn: Mock<(...args: any[]) => Promise<Hex | undefined>>;
  const testChainId = 1;
  const testAddress: Address = "0x1234567890123456789012345678901234567890";
  const gnosisChainId = 100;
  const gnosisDaiAddress: Address = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

  beforeEach(() => {
    // Mock the manager's send method
    mockSendFn = mock(async (chainId, method, params) => {
      console.log(`>>> MOCK manager.send called: chain=${chainId}, method=${method}, params=${JSON.stringify(params)}`);
      if (method === "eth_call") {
        const callData = params[0]?.data;
        // Simulate responses based on expected encoded call data
        if (callData === "0x20965255") {
          // getValue()
          return encodeFunctionResult({ abi: testAbi, functionName: "getValue", result: 123n });
        }
        if (callData === "0x38cc4831") {
          // getAddress() - Corrected Signature
          return encodeFunctionResult({ abi: testAbi, functionName: "getAddress", result: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" });
        }
        if (callData === "0xdeadbeef") {
          // Simulate empty result
          return "0x";
        }
        // Simulate Gnosis DAI calls
        if (chainId === gnosisChainId && params[0]?.to === gnosisDaiAddress) {
          if (callData === "0x95d89b41") {
            // symbol()
            return encodeFunctionResult({ abi: erc20Abi, functionName: "symbol", result: "DAI" });
          }
          if (callData === "0x18160ddd") {
            // totalSupply()
            return encodeFunctionResult({ abi: erc20Abi, functionName: "totalSupply", result: 1000000000000000000000n }); // 1000 DAI
          }
        }
      }
      return undefined; // Default undefined for unexpected calls
    });

    // Create a mock manager object
    mockRpcManager = {
      send: mockSendFn,
    } as any;
  });

  it("should call manager.send with correct eth_call parameters", async () => {
    await readContract({
      manager: mockRpcManager,
      chainId: testChainId,
      address: testAddress,
      abi: testAbi,
      functionName: "getValue",
    });
    expect(mockSendFn).toHaveBeenCalledTimes(1);
    expect(mockSendFn).toHaveBeenCalledWith(testChainId, "eth_call", [{ to: testAddress, data: "0x20965255" }, "latest"]);
  });

  it("should decode uint256 result correctly", async () => {
    const result = await readContract<bigint>({
      manager: mockRpcManager,
      chainId: testChainId,
      address: testAddress,
      abi: testAbi,
      functionName: "getValue",
    });
    expect(result).toBe(123n);
  });

  it("should decode address result correctly", async () => {
    const result = await readContract<Address>({
      manager: mockRpcManager,
      chainId: testChainId,
      address: testAddress,
      abi: testAbi,
      functionName: "getAddress",
    });
    // Compare case-insensitively
    expect(result.toLowerCase()).toBe("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd");
  });

  it("should throw if function name is not in ABI", async () => {
    await expect(
      readContract({
        manager: mockRpcManager,
        chainId: testChainId,
        address: testAddress,
        abi: testAbi,
        functionName: "functionNotInAbi",
      })
    ).rejects.toThrow(/Function functionNotInAbi not found on provided ABI/);
    expect(mockSendFn).not.toHaveBeenCalled();
  });

  it("should throw if manager.send fails", async () => {
    mockSendFn.mockRejectedValueOnce(new Error("RPC Unavailable"));
    await expect(
      readContract({
        manager: mockRpcManager,
        chainId: testChainId,
        address: testAddress,
        abi: testAbi,
        functionName: "getValue",
      })
    ).rejects.toThrow(/eth_call failed: RPC Unavailable/);
    expect(mockSendFn).toHaveBeenCalledTimes(1);
  });

  it('should handle empty result ("0x") from eth_call', async () => {
    mockSendFn.mockImplementation(async (chainId, method, params) => {
      if (method === "eth_call" && params[0]?.data === "0x20965255") return "0x";
      return undefined;
    });
    await expect(
      readContract({
        manager: mockRpcManager,
        chainId: testChainId,
        address: testAddress,
        abi: testAbi,
        functionName: "getValue", // Expects uint256
      })
    ).rejects.toThrow(/Failed to decode result|Contract call reverted/);
  });

  // --- Test with Mocked Permit2RpcManager ---
  it("should fetch mocked DAI details from Gnosis (Chain 100)", async () => {
    // Uses the mockRpcManager defined in beforeEach
    console.log(`\n--- Fetching MOCKED DAI details for Gnosis (Chain ${gnosisChainId}) ---`);
    try {
      const [symbol, totalSupply] = await Promise.all([
        readContract<string>({
          manager: mockRpcManager,
          chainId: gnosisChainId,
          address: gnosisDaiAddress,
          abi: erc20Abi,
          functionName: "symbol",
        }),
        readContract<bigint>({
          manager: mockRpcManager,
          chainId: gnosisChainId,
          address: gnosisDaiAddress,
          abi: erc20Abi,
          functionName: "totalSupply",
        }),
      ]);
      console.log(`Gnosis DAI Symbol (Mocked): ${symbol}`);
      console.log(`Gnosis DAI Total Supply (Mocked): ${totalSupply.toString()}`);
      expect(symbol).toBe("DAI");
      expect(totalSupply).toBe(1000000000000000000000n); // Check mock value
      expect(mockSendFn).toHaveBeenCalledTimes(2); // Called for symbol and totalSupply
    } catch (error) {
      console.error("Gnosis DAI mock test failed:", error);
      throw error; // Re-throw to fail the test
    }
  });
});
