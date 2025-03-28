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
-   Initial tests using `bun test` added for `LatencyTester`, `RpcSelector`, and `RpcHandler` (all passing).

## 3. What's Next (Immediate Tasks)

-   **Refinement:** Review error handling, logging, and configuration options (e.g., cache path, timeouts).
-   **Build Script:** Ensure the build script in `package.json` works correctly (`bun build ./src/index.ts --outdir ./dist --target node`).
-   **Documentation:** Add usage examples and API documentation (e.g., in README).
-   **Test Coverage:** Increase test coverage, potentially adding tests for `CacheManager` and `ChainlistDataSource`.
-   **Cleanup:** Remove any old/unused code (if applicable).

## 4. Known Issues / Blockers

-   Test coverage is not exhaustive.
-   The `lib/chainlist` submodule needs occasional manual updates (`git submodule update --remote` followed by regenerating `rpcs.json`).

## 5. Open Questions / Decisions (During Implementation/Refinement)

-   Finalize configuration options (cache path, timeouts).
-   Refine the strategy for de-prioritizing failed RPCs (currently just falls back once per `send` call).
-   Determine best approach for library distribution (e.g., publishing to npm).
