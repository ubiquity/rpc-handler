# Tech Context: Permit2 RPC Monorepo

This document outlines the technical details for the Permit2 RPC monorepo, containing the Deno proxy server and the client SDK.

## 1. Monorepo Structure

- **Root:** Contains shared configuration (`.prettierrc`, `.gitignore`), documentation (`README.md`, `docs/`), helper scripts (`scripts/`), and manages workspaces via `package.json`.
- **`packages/permit2-rpc-server`:** Contains the Deno Deploy service.
    - Runtime: Deno
    - Configuration: `deno.jsonc` (tasks, lint, fmt)
    - Entrypoint: `src/deno-server.ts`
    - Caching: Deno KV via `src/cache-manager.ts` (requires `--unstable-kv` flag)
    - Whitelist: `rpc-whitelist.json`
- **`packages/permit2-rpc-client`:** Contains the client SDK (published to npm).
    - Runtime: Node.js / Bun / Browser
    - Configuration: `package.json`, `tsconfig.json`
    - Entrypoint: `src/index.ts` (builds to `dist/`)
    - Build Tool: `bun build`

## 2. Core Technologies & Dependencies

- **Language:** TypeScript (used in both packages)
- **Server Runtime:** Deno
- **Client Build/Test Runtime:** Bun
- **Package Manager (Root & Client):** Bun
- **HTTP Client:** Native `fetch` API (used by both server and client)
- **Server Dependencies:** None (relies on Deno built-ins)
- **Client Dependencies:** None (currently)
- **Client Dev Dependencies:** `typescript`, `prettier`, `bun-types`
- **Root Dev Dependencies:** `prettier`
- **Chainlist Data:** `lib/chainlist` Git submodule. Used by root scripts (`bun run chainlist:generate`, `bun run whitelist:update`) to populate the server's `rpc-whitelist.json`.

## 3. Development Environment & Tooling

- **Linting:** `deno lint` (server), Placeholder (client)
- **Formatting:** Prettier (`bun run format:root`), `deno fmt` (server), `bun run format` (client)
- **Testing:**
    - Server: `deno task test` (requires adaptation/implementation)
    - Client: `bun test` (integration tests against server endpoint)
    - Root Scripts: `test:client:local`, `test:client:remote`
- **Version Control:** Git, utilizing submodules.
- **Deployment (Server):** Deno Deploy via GitHub Actions (`.github/workflows/deno-deploy.yml`). Manual deployment via `scripts/manual-deploy.sh`.
- **Publishing (Client):** Manual via `npm publish` from the client package directory (after `bun run build`).

## 4. Caching Strategy (Server)

- **Implementation:** Uses Deno KV via `CacheManager` (`packages/permit2-rpc-server/src/cache-manager.ts`).
- **Configuration:** KV key prefix configurable via `localStorageKey` option (defaults to `permit2RpcManagerCache`). TTL configurable via `cacheTtlMs` (defaults to 1 hour).
- **Testing:** Can be disabled for local testing by setting the `DISABLE_RPC_CACHE=true` environment variable when running the client tests (`bun run test:client:local`).

## 5. Key Constraints & Considerations

- **Server:**
    - Requires `--unstable-kv` flag for Deno KV access.
    - Relies on `rpc-whitelist.json` for upstream endpoints.
    - Handles CORS and batch requests.
    - Core logic (`Permit2RpcManager`) handles RPC selection and fallback.
- **Client:**
    - Simple `fetch` wrapper for the server API.
    - Needs the correct server `baseUrl` during initialization.
    - Tested using `bun test`.
- **Whitelist:** Quality of the server's `rpc-whitelist.json` (curated via root scripts) is crucial for performance and reliability.
