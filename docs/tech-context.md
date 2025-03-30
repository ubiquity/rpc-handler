# Tech Context: Permit2 RPC Manager Rewrite

## 1. Core Technologies

- **Language:** TypeScript
- **Runtime Environment:** Node.js (>= 20.10.0 specified)
- **Package Manager:** `bun` (User preference for installation and running scripts)
- **Build System:** `esbuild` (for bundling JavaScript/TypeScript), `tsc` (for generating type definitions)
- **Testing Framework:** `bun test` (Bun's built-in test runner)

## 2. Key Dependencies

- **EVM Interaction/Utilities:** `viem` (Used for ABI encoding/decoding in `readContract` helper).
- **HTTP Client:** Native `fetch` API (available in Node >= 18, Bun, and browsers) is used for all RPC communications.
- **Chainlist Data:** `lib/chainlist` Git submodule. `generate-json.js` script within the submodule is used by helper scripts to update the local `src/rpc-whitelist.json`.
- **Development/Build:**
    - `npm-run-all`: Used for running multiple npm scripts sequentially or concurrently (e.g., in release and dev scripts).
    - `onchange`: Used to watch source files and trigger rebuilds in development (`dev:browser` script).
    - `live-server`: Used to serve the `index.html` test environment with live reload (`dev:browser` script).

## 3. Development Environment & Tooling

- **Linting:** ESLint (Configuration not shown, assumed standard).
- **Formatting:** Prettier.
- **Spell Checking:** CSpell.
- **Git Hooks:** Husky for pre-commit checks (linting, formatting).
- **Version Control:** Git, utilizing submodules for the Chainlist dependency.

## 4. Caching Strategy

- **Requirement:** Cache latency test results and the selected fastest RPC per chain.
- **Implementation:**
  - **Browser/Worker:** Uses `localStorage` via the main `CacheManager` class. The storage key is configurable.
  - **Node.js/Bun:** File-based caching is handled by the separate `NodeCacheHandler` class (`src/cache-manager.node.ts`). This is *not* used by default by `Permit2RpcManager` to ensure browser compatibility. Node applications needing file caching must explicitly configure or use `NodeCacheHandler`. The file path is configurable, defaulting to a file in the system's temporary directory (`os.tmpdir()`).

## 5. Constraints & Considerations

- **RPC Whitelist:** Uses `src/rpc-whitelist.json` to define the pool of RPCs to test per chain.
- **Latency Testing (Optimized):**
  - Performs an initial, lightweight check (e.g., `eth_chainId`) for basic connectivity and CORS compatibility.
  - Only if the initial check passes quickly, it performs secondary checks (`eth_getCode` for Permit2 bytecode, `eth_syncing`).
  - Returns detailed status (`ok`, `wrong_bytecode`, `syncing`, `timeout`, `http_error`, `rpc_error`, `network_error`).
  - Expected browser CORS failures (`Failed to fetch`) are logged at 'debug' level to reduce console noise.
- **RPC Selection & Fallback:**
  - `RpcSelector` ranks usable RPCs by status (`ok` > `wrong_bytecode` > `syncing`) then latency.
  - `Permit2RpcManager.send` uses a round-robin starting index for concurrent requests to distribute load.
  - `Permit2RpcManager.send` iterates through the full ranked list on failure, providing robust fallback. It includes a runtime cooldown mechanism (configurable via `runtimeFailureCooldownMs`, default 60s) to temporarily skip RPCs that fail during execution, preventing repeated attempts on temporarily faulty endpoints.
- **Browser Compatibility:**
  - Designed to run in browsers/workers without requiring Node.js built-ins (using build-time defines and separated Node logic).
  - Relies on RPCs in `rpc-whitelist.json` having permissive CORS headers for successful operation in the browser.
- **`bun` Usage:**
  - `bun install` for dependencies.
  - `bun run build` / `bun run build:browser` for building.
  - `bun test` for testing.
  - `bun run dev:browser` for browser development workflow.
  - `npm run release:*` for publishing (uses `bun run` internally for build steps).
