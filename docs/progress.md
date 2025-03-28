# Progress: RPC Handler Rewrite

## 1. Current Status (March 28, 2025)

-   **Phase:** Planning & Setup
-   **Overall Progress:** 5% (Initial documentation and planning complete)

## 2. What Works

-   Core documentation structure (`project-brief.md`, `product-context.md`, `system-patterns.md`, `tech-context.md`, `active-context.md`, `progress.md`) has been established in the `docs/` directory.
-   High-level plan and architecture are defined.
-   Project dependencies and technical stack are understood.

## 3. What's Next (Immediate Tasks)

-   **Generate Chainlist Data:** Execute `lib/chainlist/generate-json.js` to create the initial RPC data file.
-   **Implement `ChainlistDataSource`:** Create the component to load and parse the generated JSON data.
-   **Implement `CacheManager`:** Basic implementation (in-memory Map for Node.js).

## 4. Known Issues / Blockers

-   None currently identified.

## 5. Open Questions / Decisions (During Implementation)

-   Optimal frequency for updating the Chainlist data file (manual for now).
-   Specific implementation details for browser vs. Node.js environment detection.
-   Exact mechanism for de-prioritizing failed RPCs in the error handling flow.
-   Configuration options for cache file location (Node.js).
