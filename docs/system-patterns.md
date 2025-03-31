# System Patterns: Permit2 RPC Manager Rewrite

## 1. High-Level Architecture

The Deno Deploy service acts as a proxy, utilizing the core RPC manager logic:

```mermaid
flowchart TD
    subgraph Deno Deploy Service
        A[HTTP Server (deno-server.ts)] --> B{Permit2RpcManager}
        B --> C{RPC Selector}
        C --> D[Latency Tester]
        C --> E[Cache Manager (Deno KV)]
        D --> E
        B --> F[Chainlist Data Source]
        F --> C
        E --> C
    end

    User[Browser/Client] -- POST /rpc/{chainId} --> A
    C --> Network[(External RPC Endpoints)]

    style User fill:#D6EAF8,stroke:#333,stroke-width:2px
    style Network fill:#E8DAEF,stroke:#333,stroke-width:2px
```

## 2. Component Descriptions

- **HTTP Server (`deno-server.ts`):** The Deno entrypoint. Handles incoming HTTP requests (`POST /rpc/{chainId}`), parses single or batch JSON-RPC payloads, sets CORS headers, interacts with `Permit2RpcManager`, and proxies responses back to the client.
- **Permit2RpcManager:** The main logic class. Integrates other components. Exposes the `send` method (used internally by the server) for making RPC calls. Implements round-robin starting point selection and iterative fallback logic. Accepts configuration options (timeouts, logging, cache settings, initial RPC data, disableCache). Instantiates internal components like `CacheManager` and `ChainlistDataSource`.
- **Chainlist Data Source (`ChainlistDataSource`):** Loads the curated list of RPC endpoints from `src/rpc-whitelist.json` (or accepts initial data passed via `Permit2RpcManager` options). Provides the list of URLs for a given chain to the `RpcSelector`.
- **Latency Tester (`LatencyTester`):** Tests the response time and validity of whitelisted RPC endpoints when triggered by the `RpcSelector` (typically on cache miss/expiry).
    - *Optimization:* Performs `eth_chainId` first, then `eth_getCode` (Permit2) and `eth_syncing`.
    - Returns detailed results (`ok`, `wrong_bytecode`, `syncing`, `timeout`, `http_error`, `rpc_error`, `network_error`).
- **Cache Manager (`CacheManager`):** Stores the detailed `LatencyTestResult` map for each chain using **Deno KV** for persistence. Accepts configuration for TTL and the KV key prefix.
- **RPC Selector (`RpcSelector`):** The core ranking logic unit.
  1.  Provides `getRankedRpcList(chainId)` method.
  2.  Checks `CacheManager` (Deno KV) for fresh latency data.
  3.  If cache is stale/invalid, triggers `LatencyTester` (using a locking mechanism).
  4.  Updates cache with new test results.
  5.  Filters out RPCs with error statuses.
  6.  Sorts usable RPCs based on status priority (`ok` > `wrong_bytecode` > `syncing`) then latency.
  7.  Returns the final sorted list of usable RPC URLs to `Permit2RpcManager`.

## 3. Key Design Patterns

- **Proxy Pattern:** The Deno server acts as a proxy, forwarding requests to the best available upstream RPC.
- **Ranking Strategy:** The `RpcSelector` ranks usable RPCs using a compound strategy (status priority then latency).
- **Round-Robin Load Distribution:** The `Permit2RpcManager` selects the *starting* RPC for each new request in a round-robin fashion to distribute load.
- **Iterative Fallback:** The `Permit2RpcManager.send` method iterates through the entire ranked list upon failure.
- **Caching:** Uses Deno KV via `CacheManager` to store latency test results.
- **Modular Design:** Core logic components remain focused on distinct responsibilities.

## 4. Data Flow (Simplified Request via Proxy)

1.  Client sends `POST /rpc/{chainId}` request with a single or batch JSON-RPC payload to the Deno Deploy service URL.
2.  `deno-server.ts` receives the request, parses `chainId` and the payload (detecting single vs. batch).
3.  For each request in the payload (or the single request), it calls `manager.send(chainId, method, params)`. Batch requests are typically processed concurrently using `Promise.allSettled` or similar.
4.  For each `send` call, `Permit2RpcManager` asks `rpcSelector.getRankedRpcList(chainId)`.
5.  `RpcSelector` checks `CacheManager` (Deno KV).
    - If cache is valid, returns cached ranked list.
    - If cache is invalid:
        - Triggers `LatencyTester.testRpcUrls` (with locking).
        - `LatencyTester` performs checks.
        - Results are used to rank usable RPCs.
        - `CacheManager` (Deno KV) is updated.
        - The ranked list is returned.
6.  `Permit2RpcManager` determines its *starting* RPC using round-robin.
7.  It enters its iterative loop:
    - Attempts `executeRpcCall` with the current RPC URL.
    - If successful, returns the result.
    - If it fails, tries the next RPC.
8.  `deno-server.ts` collects the result(s) or error(s) for each request.
9.  `deno-server.ts` constructs a single or batch JSON-RPC response and sends it back to the client with CORS headers.
