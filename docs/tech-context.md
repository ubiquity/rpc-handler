# Tech Context: Permit2 RPC Manager Rewrite

## 1. Core Technologies

- **Language:** TypeScript
- **Runtime Environment:** Deno (Deployed via Deno Deploy)
- **Package Manager:** `bun` (Still used for managing helper scripts like whitelist updates)
- **Build System:** None (Deno handles modules directly)
- **Testing Framework:** `deno test` (Requires test adaptation)

## 2. Key Dependencies

- **EVM Interaction/Utilities:** `viem` (Used for ABI encoding/decoding in `readContract` helper).
- **HTTP Client:** Native `fetch` API (available in Node >= 18, Bun, and browsers) is used for all RPC communications.
- **Chainlist Data:** `lib/chainlist` Git submodule. `generate-json.js` script within the submodule is used by helper scripts (`bun run chainlist:generate`) to update the local `src/rpc-whitelist.json`.

## 3. Development Environment & Tooling

- **Linting:** `deno lint`
- **Formatting:** Prettier (`bun run format`), `deno fmt`
- **Spell Checking:** CSpell.
- **Version Control:** Git, utilizing submodules for the Chainlist dependency.
- **Deployment:** Deno Deploy via GitHub Actions (`.github/workflows/deno-deploy.yml`).

## 4. Caching Strategy

- **Requirement:** Cache latency test results and the selected fastest RPC per chain.
- **Implementation:** Uses Deno KV for persistent server-side caching via the `CacheManager` class (`src/cache-manager.ts`). The KV key is configurable via the `localStorageKey` option in the `Permit2RpcManager` constructor (defaults to `permit2RpcManagerCache`).

## 5. Constraints & Considerations

- **RPC Whitelist:** Uses `src/rpc-whitelist.json` to define the pool of RPCs to test per chain.
- **Latency Testing (Optimized):**
  - Performs an initial, lightweight check (e.g., `eth_chainId`) for basic connectivity.
  - Only if the initial check passes quickly, it performs secondary checks (`eth_getCode` for Permit2 bytecode, `eth_syncing`).
  - Returns detailed status (`ok`, `wrong_bytecode`, `syncing`, `timeout`, `http_error`, `rpc_error`, `network_error`).
- **RPC Selection & Fallback:**
  - `RpcSelector` ranks usable RPCs by status (`ok` > `wrong_bytecode` > `syncing`) then latency.
  - `Permit2RpcManager.send` (used internally by the proxy) uses a round-robin starting index for concurrent requests to distribute load.
  - `Permit2RpcManager.send` iterates through the full ranked list on failure, providing robust fallback.
- **CORS Handling:** The Deno server (`src/deno-server.ts`) handles OPTIONS preflight requests and adds `Access-Control-Allow-*` headers to all responses.
- **`bun` Usage:**
  - Still used for running helper scripts (`whitelist:update`, `whitelist:test`, `chainlist:generate`, `format`).
- **`deno` Usage:**
  - `deno run --allow-* src/deno-server.ts` for local execution.
  - `deno test --allow-*` for testing (requires adaptation).
  - `deno fmt` / `deno lint` for code quality.
