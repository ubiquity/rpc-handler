import { beforeEach, describe, expect, it, mock, Mock } from 'bun:test';
import type { Address, Hex } from 'viem';
import { encodeFunctionResult } from 'viem';
import { readContract } from '../src/contract-utils.js';
import { RpcHandler } from '../src/rpc-handler.js';

// Example ABI for testing
const testAbi = [
  { name: 'getValue', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'getAddress', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'complexReturn', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }, { type: 'address' }] },
  { name: 'setValue', type: 'function', stateMutability: 'nonpayable', inputs: [{ type: 'uint256' }], outputs: [] }, // Non-view
  { name: 'nonExistent', type: 'function', stateMutability: 'view', inputs: [], outputs: [] }, // For testing ABI mismatch
] as const; // Use 'as const'

describe('readContract', () => {
  let mockHandler: RpcHandler;
  let mockSendFn: Mock<(...args: any[]) => Promise<Hex | undefined>>;
  const testChainId = 1;
  const testAddress: Address = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    // Mock the handler's send method
    mockSendFn = mock(async (chainId, method, params) => {
      console.log(`>>> MOCK handler.send called: chain=${chainId}, method=${method}, params=${JSON.stringify(params)}`);
      if (method === 'eth_call') {
        const callData = params[0]?.data;
        // Simulate responses based on expected encoded call data
        if (callData === '0x20965255') { // getValue()
            return encodeFunctionResult({ abi: testAbi, functionName: 'getValue', result: 123n });
        }
         if (callData === '0x35befaf7') { // getAddress()
              return encodeFunctionResult({ abi: testAbi, functionName: 'getAddress', result: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' });
         }
         // Removed encodeErrorResult simulation as 'TestError' is not in testAbi
         // if (callData === '0xabcdef12') { // Simulate a revert with error signature
         //     return encodeErrorResult({ abi: testAbi, errorName: 'TestError', args: ['reason'] });
         // }
          if (callData === '0xdeadbeef') { // Simulate empty result
              return '0x';
         }
      }
      return undefined; // Default undefined for unexpected calls
    });

    // Create a mock handler object
    mockHandler = {
      send: mockSendFn,
      // Add other RpcHandler properties/methods if needed by readContract (currently none)
    } as any; // Use 'as any' for simplicity
  });

  it('should call handler.send with correct eth_call parameters', async () => {
    await readContract({
      handler: mockHandler,
      chainId: testChainId,
      address: testAddress,
      abi: testAbi,
      functionName: 'getValue',
    });

    expect(mockSendFn).toHaveBeenCalledTimes(1);
    expect(mockSendFn).toHaveBeenCalledWith(
      testChainId,
      'eth_call',
      [
        {
          to: testAddress,
          data: '0x20965255', // Encoded getValue()
        },
        'latest',
      ]
    );
  });

  it('should decode uint256 result correctly', async () => {
    const result = await readContract<bigint>({
      handler: mockHandler,
      chainId: testChainId,
      address: testAddress,
      abi: testAbi,
      functionName: 'getValue',
    });
    expect(result).toBe(123n);
  });

  it('should decode address result correctly', async () => {
    const result = await readContract<Address>({
      handler: mockHandler,
      chainId: testChainId,
      address: testAddress,
      abi: testAbi,
      functionName: 'getAddress',
    });
    expect(result).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
  });

  it('should throw if function name is not in ABI', async () => {
     await expect(readContract({
      handler: mockHandler,
      chainId: testChainId,
      address: testAddress,
      abi: testAbi,
      functionName: 'functionNotInAbi', // Incorrect name
    })).rejects.toThrow(/Function functionNotInAbi not found on provided ABI/);
     expect(mockSendFn).not.toHaveBeenCalled(); // Should fail before sending
  });

   it('should throw if handler.send fails', async () => {
       mockSendFn.mockRejectedValueOnce(new Error("RPC Unavailable"));

       await expect(readContract({
        handler: mockHandler,
        chainId: testChainId,
        address: testAddress,
        abi: testAbi,
        functionName: 'getValue',
      })).rejects.toThrow(/eth_call failed: RPC Unavailable/);
       expect(mockSendFn).toHaveBeenCalledTimes(1);
   });

    it('should handle empty result ("0x") from eth_call (might indicate revert without reason)', async () => {
        // Override mockSendFn for this test
        mockSendFn.mockImplementation(async (chainId, method, params) => {
             if (method === 'eth_call' && params[0]?.data === '0x20965255') { // getValue()
                return '0x';
             }
             return undefined;
        });

        // Depending on the ABI's return type, decodeFunctionResult might throw or return default/undefined
        // Testing that it *doesn't* throw an unhandled error here.
        // We expect viem to potentially throw a decoding error if '0x' is invalid for the return type.
         await expect(readContract({
            handler: mockHandler,
            chainId: testChainId,
            address: testAddress,
            abi: testAbi,
            functionName: 'getValue', // Expects uint256, '0x' is invalid
        })).rejects.toThrow(/Failed to decode result|Contract call reverted/); // Expect viem decoding error or revert error
    });

    // Note: Testing specific revert reasons requires adding Error definitions to the ABI
    // and adjusting the mockSendFn to return encoded error data.

});
