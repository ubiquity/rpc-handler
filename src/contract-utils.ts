import { Abi, AbiFunctionNotFoundError, Address, CallExecutionError, decodeFunctionResult, encodeFunctionData, Hex } from "viem";
import { Permit2RpcManager } from "./permit2-rpc-manager.js"; // Use .js extension

// Define a logger type (can be shared or defined per file)
type LoggerFn = (level: "debug" | "info" | "warn" | "error", message: string, ...optionalParams: any[]) => void;

/**
 * Options for calling a read-only contract function.
 */
export interface ReadContractOptions {
  manager: Permit2RpcManager;
  chainId: number;
  address: Address;
  abi: Abi;
  functionName: string;
  args?: any[];
  logger?: LoggerFn; // Add optional logger
  // blockNumber?: bigint; // Future enhancement: Allow specifying block number/tag
  // blockTag?: 'latest' | 'earliest' | 'pending' | 'safe' | 'finalized';
}

/**
 * Calls a read-only smart contract function using eth_call via the Permit2RpcManager.
 *
 * @param options - The options for the contract call.
 * @returns The decoded result of the function call.
 * @throws If the function doesn't exist in the ABI, the call reverts, or the Permit2RpcManager fails.
 */
export async function readContract<T = any>({
  manager,
  chainId,
  address,
  abi,
  functionName,
  args,
  logger = () => {}, // Default to no-op logger
}: ReadContractOptions): Promise<T> {
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
      logger("error", `Error encoding function data: Function ${functionName} not found on ABI.`);
      throw new Error(`Function ${functionName} not found on provided ABI.`);
    }
    logger("error", `Error encoding function data for ${functionName}:`, err);
    throw new Error(`Failed to encode function data: ${err instanceof Error ? err.message : String(err)}`);
  }

  logger("debug", `Encoded call data for ${functionName}: ${callData}`);

  let rawResult: Hex | undefined;
  try {
    // Use the Permit2RpcManager to send the eth_call
    rawResult = await manager.send<Hex>(chainId, "eth_call", [
      {
        to: address,
        data: callData,
      },
      "latest", // block tag
    ]);
    logger("debug", `Raw eth_call result for ${functionName}: ${rawResult}`);

    // Handle cases where eth_call might return "0x" or undefined for reverts/errors
    if (rawResult === undefined || rawResult === "0x") {
      // This might indicate a revert without a reason, or an empty return value.
      // Attempting to decode might fail, or might return default values.
      // Consider if specific error handling is needed here based on contract behavior.
      logger("warn", `eth_call for ${functionName} returned potentially empty result: ${rawResult}`);
      // Let decode attempt handle it, it might throw if decoding fails
    }
  } catch (error) {
    // Catch errors from the Permit2RpcManager (network, RPC errors, etc.)
    logger("error", `eth_call via Permit2RpcManager failed for ${functionName} on chain ${chainId}:`, error);
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
    logger("error", `Error decoding result for ${functionName}:`, err);
    // Check if it's a revert error from viem (CallExecutionError)
    if (err instanceof CallExecutionError) {
      throw new Error(`Contract call reverted: ${err.shortMessage}`);
    }
    throw new Error(`Failed to decode result: ${err instanceof Error ? err.message : String(err)}`);
  }
}
