import type { ReadContractOptions } from './contract-utils.js'; // Export type
import { readContract } from './contract-utils.js';
import type { RpcHandlerOptions } from './rpc-handler.js'; // Export type
import { RpcHandler } from './rpc-handler.js';

// Export the main handler class and helper function
export { readContract, RpcHandler };

// Export types
    export type { ReadContractOptions, RpcHandlerOptions };
