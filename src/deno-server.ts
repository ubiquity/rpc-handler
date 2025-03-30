/// <reference lib="deno.ns" />
// Deno Deploy entrypoint for the Permit2 RPC Manager Proxy

// Note: CacheManager will be adapted for Deno KV later
// ChainlistDataSource is instantiated internally by Permit2RpcManager
// import { ChainlistDataSource } from './chainlist-data-source.ts';
import { Permit2RpcManager } from './permit2-rpc-manager.ts';
import rpcWhitelist from './rpc-whitelist.json' with { type: 'json' };

// Simple interface for JSON-RPC request structure
interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params: unknown[];
  id: number | string;
}

const PORT = parseInt(Deno.env.get('PORT') ?? '8000');

console.log('Initializing Permit2 RPC Manager Proxy...');

// Instantiate Permit2RpcManager, passing initial data.
// It will create its own CacheManager and ChainlistDataSource internally.
// We still need to adapt CacheManager for Deno KV later.
const manager = new Permit2RpcManager({
  initialRpcData: rpcWhitelist,
  // TODO: Configure CacheManager options for Deno KV once adapted
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

  let rpcRequest: JsonRpcRequest;
  try {
    // Explicitly type the parsed JSON
    rpcRequest = await request.json() as JsonRpcRequest;
    if (rpcRequest.jsonrpc !== '2.0' || !rpcRequest.method || !Array.isArray(rpcRequest.params) || rpcRequest.id === undefined || rpcRequest.id === null) {
      throw new Error('Invalid JSON-RPC request structure');
    }
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error('Failed to parse request body:', error);
    return new Response(`Bad Request: Invalid JSON body or structure. ${error.message}`, { status: 400, headers: corsHeaders });
  }

  console.log(`Received request for chain ${chainId}: ${rpcRequest.method}`);

  try {
    // Use the actual manager instance
    const result = await manager.send(chainId, rpcRequest.method, rpcRequest.params);

    // Construct valid JSON-RPC response
    const rpcResponse = { jsonrpc: '2.0', id: rpcRequest.id, result };

    return new Response(JSON.stringify(rpcResponse), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error(`Error processing RPC request for chain ${chainId}:`, error);
    const errorResponse = {
      jsonrpc: '2.0',
      id: rpcRequest.id,
      error: {
        code: -32000, // Generic server error
        message: `Internal Server Error: ${error.message}`,
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
};

console.log(`Permit2 RPC Manager Proxy listening on http://localhost:${PORT}`);
Deno.serve({ port: PORT }, handler);
