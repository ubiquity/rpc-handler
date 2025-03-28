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

## 3. What's Next (Immediate Tasks)

-   **Testing:** Implement unit/integration tests for the components, especially `RpcHandler` and `RpcSelector`.
-   **Refinement:** Review error handling, logging, and configuration options (e.g., cache path).
-   **Build Script:** Ensure the build script in `package.json` works correctly.
-   **Documentation:** Add usage examples and API documentation (e.g., in README).
-   **Cleanup:** Remove any old/unused code (if applicable, though we started fresh).

## 4. Known Issues / Blockers

-   No automated tests yet.
-   The `lib/chainlist` submodule needs occasional manual updates (`git submodule update --remote` followed by regenerating `rpcs.json`).

## 5. Open Questions / Decisions (During Implementation/Refinement)

-   Finalize configuration options (cache path, timeouts).
-   Refine the strategy for de-prioritizing failed RPCs (currently just falls back once per `send` call).
-   Determine best approach for library distribution (e.g., publishing to npm).
