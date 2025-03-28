import { Abi, AbiFunctionNotFoundError, Address, CallExecutionError, decodeFunctionResult, encodeFunctionData, Hex } from "viem";
import { RpcHandler } from "./rpc-handler.js";

/**
 * Options for calling a read-only contract function.
 */
export interface ReadContractOptions {
  handler: RpcHandler;
  chainId: number;
  address: Address;
  abi: Abi;
  functionName: string;
  args?: any[];
  // blockNumber?: bigint; // Future enhancement: Allow specifying block number/tag
  // blockTag?: 'latest' | 'earliest' | 'pending' | 'safe' | 'finalized';
}

/**
 * Calls a read-only smart contract function using eth_call via the RpcHandler.
 *
 * @param options - The options for the contract call.
 * @returns The decoded result of the function call.
 * @throws If the function doesn't exist in the ABI, the call reverts, or the RpcHandler fails.
 */
export async function readContract<T = any>({ handler, chainId, address, abi, functionName, args }: ReadContractOptions): Promise<T> {
  let callData: Hex;
  try {
    callData = encodeFunctionData({
      abi,
      functionName,
      args,
    });
  } catch (err) {
    // Catch encoding errors, e.g., function not found in ABI
    if (err instanceof AbiFunctionNotFoundError) {
      console.error(`Error encoding function data: Function ${functionName} not found on ABI.`);
      throw new Error(`Function ${functionName} not found on provided ABI.`);
    }
    console.error(`Error encoding function data for ${functionName}:`, err);
    throw new Error(`Failed to encode function data: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`Encoded call data for ${functionName}: ${callData}`);

  let rawResult: Hex | undefined;
  try {
    // Use the RpcHandler to send the eth_call
    rawResult = await handler.send<Hex>(chainId, "eth_call", [
      {
        to: address,
        data: callData,
      },
      "latest", // block tag
    ]);
    console.log(`Raw eth_call result for ${functionName}: ${rawResult}`);

    // Handle cases where eth_call might return "0x" or undefined for reverts/errors
    if (rawResult === undefined || rawResult === "0x") {
      // This might indicate a revert without a reason, or an empty return value.
      // Attempting to decode might fail, or might return default values.
      // Consider if specific error handling is needed here based on contract behavior.
      console.warn(`eth_call for ${functionName} returned potentially empty result: ${rawResult}`);
      // Let decode attempt handle it, it might throw if decoding fails
    }
  } catch (error) {
    // Catch errors from the RpcHandler (network, RPC errors, etc.)
    console.error(`eth_call via RpcHandler failed for ${functionName} on chain ${chainId}:`, error);
    throw new Error(`eth_call failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    // Decode the result
    const decodedResult = decodeFunctionResult({
      abi,
      functionName,
      data: rawResult ?? "0x", // Provide '0x' if undefined to avoid viem error
    });
    return decodedResult as T;
  } catch (err) {
    // Catch decoding errors, which might indicate a contract revert
    console.error(`Error decoding result for ${functionName}:`, err);
    // Check if it's a revert error from viem (CallExecutionError)
    if (err instanceof CallExecutionError) {
      throw new Error(`Contract call reverted: ${err.shortMessage}`);
    }
    throw new Error(`Failed to decode result: ${err instanceof Error ? err.message : String(err)}`);
  }
}
