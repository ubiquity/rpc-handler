import type { ReadContractOptions } from "./contract-utils.ts"; // Export type
import { readContract } from "./contract-utils.ts";
import type { Permit2RpcManagerOptions } from "./permit2-rpc-manager.ts"; // Export type
import { Permit2RpcManager } from "./permit2-rpc-manager.ts";

// Export the main manager class and helper function
export { Permit2RpcManager, readContract };

// Export types
export type { Permit2RpcManagerOptions, ReadContractOptions };
