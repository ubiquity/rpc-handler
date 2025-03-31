/// <reference lib="deno.ns" />
// Deno Deploy entrypoint for the Permit2 RPC Manager Proxy

// Note: CacheManager will be adapted for Deno KV later
// ChainlistDataSource is instantiated internally by Permit2RpcManager
// import { ChainlistDataSource } from './chainlist-data-source.ts';
import { Permit2RpcManager } from './permit2-rpc-manager.ts';
// Adjust path to point one level up from src/
import rpcWhitelist from '../rpc-whitelist.json' with { type: 'json' };

// Simple interface for JSON-RPC request structure
interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params: unknown[];
  id: number | string | null; // Allow null ID for notifications, though we might not process them specially
}

// Define the structure for a JSON-RPC response
interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// Type guard to check for valid JSON-RPC request object structure
function isValidJsonRpcRequest(obj: any): obj is JsonRpcRequest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    obj.jsonrpc === '2.0' &&
    typeof obj.method === 'string' &&
    (obj.params === undefined || Array.isArray(obj.params)) &&
    (typeof obj.id === 'string' || typeof obj.id === 'number' || obj.id === null)
  );
}

// Helper to create a JSON-RPC error response
function createJsonRpcError(id: number | string | null, code: number, message: string): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message },
  };
}

const PORT = parseInt(Deno.env.get('PORT') ?? '8000');

console.log('Initializing Permit2 RPC Manager Proxy...');

// Check environment variable to potentially disable cache
const disableCacheEnv = Deno.env.get('DISABLE_RPC_CACHE');
const shouldDisableCache = disableCacheEnv === 'true' || disableCacheEnv === '1';

if (shouldDisableCache) {
  console.warn("RPC Caching is DISABLED via DISABLE_RPC_CACHE environment variable.");
}

// Instantiate Permit2RpcManager, passing initial data and cache option.
const manager = new Permit2RpcManager({
  initialRpcData: rpcWhitelist,
  disableCache: shouldDisableCache,
  // TODO: Configure other CacheManager options like TTL if needed
});

const handler = async (request: Request): Promise<Response> => {
  // Set CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Allow requests from any origin
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Adjust as needed
  };

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  // Ensure request.url is valid before constructing URL
  if (!request.url) {
    return new Response('Bad Request: Missing URL', { status: 400, headers: corsHeaders });
  }
  // Assign to variable after check to help type narrowing
  const checkedUrl = request.url;
  const url = new URL(checkedUrl);
  const pathParts = url.pathname.split('/').filter(Boolean); // e.g., ['rpc', '1']

  if (pathParts.length !== 2 || pathParts[0] !== 'rpc') {
    return new Response('Not Found: Expected path /rpc/{chainId}', { status: 404, headers: corsHeaders });
  }

  const chainIdStr = pathParts[1];
  const chainId = parseInt(chainIdStr, 10);

  if (isNaN(chainId)) {
    return new Response('Bad Request: Invalid chainId', { status: 400, headers: corsHeaders });
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error('Failed to parse request body:', error);
    // Return JSON-RPC error for parse error
    const errorResponse = createJsonRpcError(null, -32700, `Parse error: ${error.message}`);
    return new Response(JSON.stringify(errorResponse), {
      status: 400, // Bad Request for parse errors
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // --- Handle Batch Request ---
  if (Array.isArray(requestBody)) {
    console.log(`Received batch request for chain ${chainId} with ${requestBody.length} calls.`);

    if (requestBody.length === 0) {
      const errorResponse = createJsonRpcError(null, -32600, 'Invalid Request: Received empty batch.');
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate all requests in the batch first
    if (!requestBody.every(isValidJsonRpcRequest)) {
      const errorResponse = createJsonRpcError(null, -32600, 'Invalid Request: Batch contains invalid JSON-RPC object(s).');
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process batch requests concurrently
    const promises = requestBody.map(async (req) => {
      try {
        const result = await manager.send(chainId, req.method, req.params ?? []);
        return { jsonrpc: '2.0', id: req.id, result } as JsonRpcResponse;
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error(`Error processing batch item (id: ${req.id}, method: ${req.method}) for chain ${chainId}:`, error);
        // Return individual error for this specific request in the batch
        return createJsonRpcError(req.id, -32000, `Internal Server Error: ${error.message}`);
      }
    });

    const responses = await Promise.all(promises);

    return new Response(JSON.stringify(responses), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  // --- Handle Single Request ---
  else if (isValidJsonRpcRequest(requestBody)) {
    console.log(`Received single request for chain ${chainId}: ${requestBody.method}`);
    try {
      const result = await manager.send(chainId, requestBody.method, requestBody.params ?? []);
      const rpcResponse: JsonRpcResponse = { jsonrpc: '2.0', id: requestBody.id, result };
      return new Response(JSON.stringify(rpcResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error(`Error processing single request (id: ${requestBody.id}, method: ${requestBody.method}) for chain ${chainId}:`, error);
      const errorResponse = createJsonRpcError(requestBody.id, -32000, `Internal Server Error: ${error.message}`);
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  // --- Handle Invalid Request Structure ---
  else {
    console.error('Invalid request body structure:', requestBody);
    const errorResponse = createJsonRpcError(null, -32600, 'Invalid Request: Not a valid JSON-RPC object or batch.');
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

console.log(`Permit2 RPC Manager Proxy listening on http://localhost:${PORT}`);
Deno.serve({ port: PORT }, handler);
