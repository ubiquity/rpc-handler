# Active Context: Permit2 RPC Proxy Service (Deno Deploy)

## 1. Current Focus

The project has been migrated from an isomorphic library to a dedicated Deno Deploy service acting as a CORS-friendly RPC proxy. The current focus is completing the migration, setting up deployment, and updating documentation.

## 2. Recent Activities & Findings

- **Migration to Deno Service:**
    - Created a Deno HTTP server entrypoint (`src/deno-server.ts`) using `Deno.serve`.
    - Adapted the `CacheManager` (`src/cache-manager.ts`) to use Deno KV for persistence, replacing `localStorage` and removing the Node.js file cache (`cache-manager.node.ts`).
    - Configured the server to handle `POST /rpc/{chainId}` requests, parse JSON-RPC payloads, and proxy them using the core `Permit2RpcManager` logic.
    - Implemented CORS handling (preflight requests and response headers).
- **Deployment Setup:**
    - Created a GitHub Actions workflow (`.github/workflows/deno-deploy.yml`) using `denoland/deployctl` to automatically deploy to Deno Deploy on pushes/PRs to `main`.
- **Project Cleanup:**
    - Removed Node.js/Bun-specific build/dev dependencies (`live-server`, `onchange`, `npm-run-all`, etc.) from `package.json`.
    - Removed obsolete build/dev/release scripts from `package.json`, replacing `start` and `test` with Deno equivalents and adding `deno:fmt` and `deno:lint`.
    - Removed the browser test file (`index.html`).
- **Documentation Updates:**
    - Updated `README.md` to describe the Deno Deploy service usage.
    - Updated `docs/tech-context.md` and `docs/system-patterns.md` to reflect the Deno runtime, Deno KV caching, and proxy architecture.

## 3. Next Steps

- **Finalize Documentation:** Update `docs/progress.md`, `docs/project-brief.md`, `docs/product-context.md`, and `.clinerules`.
- **Testing:** Adapt existing tests (`tests/*`) to run with `deno test` or create new Deno-specific tests for the server logic. (Out of scope for this task unless requested).
- **Deno Configuration:** Optionally add `deno.jsonc` for task management and configuration.
- **Error Handling:** Refine error handling and logging in `deno-server.ts`.
- **Dependency Check:** Ensure `viem` works correctly in Deno if its functionality (like `readContract`) is intended to be exposed via the proxy (currently only `send` is used).

## 4. Decisions Made & Considerations

- **Architecture:** Shifted from an isomorphic library to a dedicated Deno proxy service. Core RPC selection logic remains.
- **Caching:** Moved from `localStorage`/file cache to Deno KV for server-side persistence.
- **Deployment:** Automated via GitHub Actions to Deno Deploy.
- **Build Process:** Eliminated the need for a JS build step (using Deno's native module handling).
- **Interface:** Changed from a library import to an HTTP API endpoint (`POST /rpc/{chainId}`).
