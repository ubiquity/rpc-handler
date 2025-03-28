# Progress: RPC Handler Rewrite

## 1. Current Status (March 28, 2025)

-   **Phase:** Implementation
-   **Overall Progress:** 80% (Core components implemented)

## 2. What Works

-   Core documentation structure created.
-   Project configuration (`package.json`, `tsconfig.json`) set up.
-   Chainlist RPC data generated (`lib/chainlist/out/rpcs.json`).
-   `ChainlistDataSource` implemented to load RPC data.
-   `CacheManager` implemented with support for `localStorage` (browser) and JSON file (Node.js).
-   `LatencyTester` implemented using native `fetch` with timeouts.
-   `RpcSelector` implemented to find the fastest RPC using cache and testing.
-   `RpcHandler` (main API) implemented, integrating all components and providing `send` method with fallback logic.
-   `src/index.ts` created as the library entry point.
-   Initial tests using `bun test` added for `LatencyTester`, `RpcSelector`, `RpcHandler`, and `readContract` helper (all passing).
-   `readContract` helper function added for contract interactions using `viem`.
-   Switched from testing all Chainlist RPCs to using a curated `src/rpc-whitelist.json`.
-   Latency testing enhanced to check Permit2 bytecode and `eth_syncing`.
-   Cache stores detailed `LatencyTestResult` including failure status/reasons.
-   `README.md` created with usage examples.

## 3. What's Next (Immediate Tasks)

-   **Refinement:** Review error handling, logging, and configuration options (e.g., cache path, timeouts).
-   **Build Script:** Ensure the build script in `package.json` works correctly.
-   **Documentation:** Further refine README and potentially add more detailed API docs.
-   **Test Coverage:** Increase test coverage, especially edge cases for `CacheManager` and `ChainlistDataSource`.
-   **Whitelist Maintenance:** Review and update `rpc-whitelist.json` with more reliable endpoints.

## 4. Known Issues / Blockers

-   Test coverage is not exhaustive.
-   The initial `rpc-whitelist.json` may need expansion/refinement for broader chain support and reliability.
-   Live testing showed many public RPCs fail the strict validity checks (syncing, Permit2 bytecode).

## 5. Open Questions / Decisions (Future)

-   Finalize configuration options (cache path, timeouts).
-   Refine the strategy for handling/retrying failed RPCs beyond the current single fallback.
-   Determine best approach for library distribution (e.g., publishing to npm).
-   Consider adding support for `eth_sendRawTransaction` (requires handling nonces, gas, etc.).
