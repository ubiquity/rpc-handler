# Active Context: Permit2 RPC Monorepo (Server + Client)

## 1. Current Focus

The project has been restructured into a monorepo containing the Deno Deploy proxy service (`packages/permit2-rpc-server`) and a new client SDK (`packages/permit2-rpc-client`). Focus is now on finalizing documentation after adding batch support and local testing capabilities.

## 2. Recent Activities & Findings

- **Monorepo Restructuring:**
    - Created `packages/` directory structure.
    - Moved server code to `packages/permit2-rpc-server`.
    - Created client SDK structure in `packages/permit2-rpc-client`.
    - Configured root `package.json` for workspaces.
    - Added `deno.jsonc` to server package.
    - Added `package.json` and `tsconfig.json` to client package.
    - Updated GitHub Actions workflow path.
- **Server Enhancements:**
    - Implemented batch JSON-RPC request handling in `deno-server.ts`.
    - Fixed Deno KV access by using `--unstable-kv` flag in `deno.jsonc`.
    - Fixed `rpc-whitelist.json` import paths.
    - Removed unused `viem` dependency and related code (`contract-utils.ts`).
    - Added `disableCache` option (via `DISABLE_RPC_CACHE` env var) for testing.
- **Client SDK:**
    - Created basic implementation (`createRpcClient`, `request` method) wrapping `fetch`.
    - Set up build process using `bun build`.
- **Testing:**
    - Added integration tests (`client.test.ts`) for the client SDK using `bun test`.
    - Configured tests to read target URL from `TEST_TARGET_URL` env var.
    - Added root `package.json` scripts (`test:client:local`, `test:client:remote`) to facilitate testing against local or deployed server.
    - Successfully ran local tests (`bun run test:client:local`) after fixing server startup issues.
- **Documentation:**
    - Updated root `README.md` for monorepo structure.
    - Added package-specific `README.md` files.
    - Updated `docs/tech-context.md`, `docs/system-patterns.md`, `docs/product-context.md`.

## 3. Next Steps

- **Finalize Documentation:** Update `docs/progress.md` and `.clinerules`. (Current task)
- **Server Testing:** Implement proper tests for the Deno server package using `deno test`.
- **Client SDK Refinement:** Add more robust error handling, potentially automatic batching, and more tests to the client SDK.
- **Publishing:** Publish the `@pavlovcik/permit2-rpc-client` package to npm.
- **Abuse Prevention:** Consider implementing CORS origin restrictions or API keys for the deployed server.

## 4. Decisions Made & Considerations

- **Architecture:** Adopted a monorepo structure for managing the server and client together.
- **Caching:** Using Deno KV, fixed startup issues with `--unstable-kv`, added option to disable for testing.
- **Batch Support:** Added to the Deno server.
- **Client SDK:** Created as a separate package within the monorepo.
- **Testing:** Set up integration tests for the client SDK runnable against local or remote server. Server tests still needed.
