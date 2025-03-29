import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Address, Hex } from "viem";
import { encodeFunctionResult, parseAbiItem } from "viem";
import { Permit2RpcManager, readContract } from "../src/index.ts";

// --- Test Setup ---
const GNOSIS_CHAIN_ID = 100;
const WXDAI_ADDRESS: Address = '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d';
const TEST_ADDRESS_1: Address = '0xd9530F3fbBEa11beD01DC09E79318f2f20223716';
const TEST_ADDRESS_2: Address = '0x054Ec26398549588F3c958719bD17CC1e6E97c3C';
const TEST_ADDRESS_3: Address = '0x1111111111111111111111111111111111111111';
const TEST_ADDRESS_4: Address = '0x2222222222222222222222222222222222222222';
const TEST_ADDRESS_5: Address = '0x3333333333333333333333333333333333333333';

const erc20AbiBalanceOf = [
  parseAbiItem('function balanceOf(address owner) view returns (uint256)'),
] as const;

// Mock function to simulate successful RPC response for balanceOf
const mockBalanceOfSuccessResult = (balance: bigint = 1n): Hex => {
    return encodeFunctionResult({
        abi: erc20AbiBalanceOf,
        functionName: 'balanceOf',
        result: balance
    });
};

describe("Client Integration Tests - Failover Simulation", () => {
  let manager: Permit2RpcManager;
  let originalExecuteRpcCall: typeof manager.executeRpcCall; // To store the original method

  beforeEach(() => {
    manager = new Permit2RpcManager({
      logLevel: "debug",
      // cacheTtlMs: 0, // REMOVED: Allow cache to work
      latencyTimeoutMs: 7000,
      requestTimeoutMs: 7000,
    });
    // Store the original method before mocking
    originalExecuteRpcCall = manager.executeRpcCall.bind(manager);
    // Clear any ongoing test locks
    const ongoingTests = (manager.rpcSelector as any).constructor.ongoingLatencyTests;
    if (ongoingTests) {
        ongoingTests.clear();
    }
  });

  // Increase timeout for this specific test involving network calls
  it("should successfully complete concurrent calls despite primary RPC failure", async () => {
    console.log("\n--- Starting Concurrent Failover Test ---");

    // 1. Get the initial ranked list (runs latency test if needed)
    const initialRankedList = await manager.rpcSelector.getRankedRpcList(GNOSIS_CHAIN_ID);
    console.log("Initial Ranked List:", initialRankedList);
    expect(initialRankedList.length).toBeGreaterThan(1);

    const primaryRpc = initialRankedList[0];
    const fallbackRpc = initialRankedList[1];
    console.log(`Simulating failure for primary RPC: ${primaryRpc}`);
    console.log(`Expecting fallback to succeed on: ${fallbackRpc}`);

    // 2. Mock manager.executeRpcCall to force failure on the primary RPC
    let primaryFailCount = 0;
    let fallbackSuccessCount = 0;

    // Use type assertion 'as any' to assign the mock to the generic method
    manager.executeRpcCall = mock(async (url: string, method: string, params: any[]) => {
        console.log(`>>> MOCK executeRpcCall: Intercepted call to ${url} for ${method}`);
        if (url === primaryRpc) {
            primaryFailCount++;
            console.log(`>>> MOCK executeRpcCall: Simulating failure for primary ${url}`);
            throw new Error(`Simulated failure for ${primaryRpc}`);
        } else {
            // Allow calls to other RPCs (including the fallback) to proceed using the original method
            console.log(`>>> MOCK executeRpcCall: Allowing call to ${url}`);
            // Calling original is better to test real network fallback
            const result = await originalExecuteRpcCall(url, method, params);
            if (url === fallbackRpc) {
                fallbackSuccessCount++;
            }
            return result;
        }
    }) as any; // Add type assertion here

    // 3. Create multiple concurrent readContract calls
    const addressesToTest = [TEST_ADDRESS_1, TEST_ADDRESS_2, TEST_ADDRESS_3, TEST_ADDRESS_4, TEST_ADDRESS_5];
    const promises = addressesToTest.map(addr =>
      readContract<bigint>({
        manager, // Pass the manager with the mocked executeRpcCall
        chainId: GNOSIS_CHAIN_ID,
        address: WXDAI_ADDRESS,
        abi: erc20AbiBalanceOf,
        functionName: 'balanceOf',
        args: [addr],
        logger: (level, msg, ...params) => console.log(`[ReadContract:${level}] ${msg}`, ...params)
      }).catch(err => {
          console.error(`Caught error for address ${addr}: ${err.message}`);
          throw err;
      })
    );

    // 4. Execute concurrently
    console.log(`Executing ${promises.length} concurrent readContract calls...`);
    const results = await Promise.allSettled(promises);
    console.log("Concurrent call results:", results);

    // 5. Assert results
    const fulfilledCount = results.filter(r => r.status === 'fulfilled').length;
    const rejectedCount = results.filter(r => r.status === 'rejected').length;

    console.log(`Fulfilled: ${fulfilledCount}, Rejected: ${rejectedCount}`);
    console.log(`Primary RPC Failures Simulated: ${primaryFailCount}`);
    console.log(`Fallback RPC Successes Recorded: ${fallbackSuccessCount}`);

    // Assert that all calls succeeded by falling back
    expect(fulfilledCount).toBe(addressesToTest.length);
    expect(rejectedCount).toBe(0);
    // With round-robin start index, we don't expect primaryFailCount or fallbackSuccessCount to be 5.
    // The important part is that all calls succeeded despite the simulated failure of the primary RPC
    // when it was encountered. We can check that *at least one* primary failure was simulated.
    expect(primaryFailCount).toBeGreaterThanOrEqual(1);

    // Restore original method (though typically handled by beforeEach)
    manager.executeRpcCall = originalExecuteRpcCall;
  }, 15000); // Keep increased timeout
});
