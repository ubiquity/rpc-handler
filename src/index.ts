import type { ReadContractOptions } from "./contract-utils.js"; // Export type
import { readContract } from "./contract-utils.js";
import type { Permit2RpcManagerOptions } from "./permit2-rpc-manager.js"; // Export type
import { Permit2RpcManager } from "./permit2-rpc-manager.js";

// Export the main manager class and helper function
export { Permit2RpcManager, readContract };

// Export types
export type { Permit2RpcManagerOptions, ReadContractOptions };
