# Tech Context: RPC Handler Rewrite

## 1. Core Technologies

-   **Language:** TypeScript
-   **Runtime Environment:** Node.js (>= 20.10.0 specified)
-   **Package Manager:** `bun` (User preference for installation and running scripts)
-   **Build System:** `esbuild` (for bundling JavaScript/TypeScript), `tsc` (for generating type definitions)
-   **Testing Framework:** `jest` with `ts-jest`

## 2. Key Dependencies (Inferred/Planned)

-   **EVM Interaction:** `@ethersproject/providers` (or potentially a successor like `ethers` v6) will likely be used for making the actual RPC calls and potentially for latency testing methods like `getBlockNumber`.
-   **HTTP Client:** `axios` or `node-fetch` (or potentially `bun`'s built-in fetch) will be used for:
    -   Making RPC calls during latency testing.
    -   Potentially fetching Chainlist data if the local generation method isn't used (though local generation is preferred).
-   **Chainlist Data:** The project includes `lib/chainlist` as a Git submodule. The plan is to utilize the `generate-json.js` script within this submodule to create a local JSON file containing the list of RPC endpoints. This file will be the primary source for the `Chainlist Data Source` component.

## 3. Development Environment & Tooling

-   **Linting:** ESLint with TypeScript plugins.
-   **Formatting:** Prettier.
-   **Spell Checking:** CSpell.
-   **Git Hooks:** Husky for pre-commit checks (linting, formatting).
-   **Version Control:** Git, utilizing submodules for the Chainlist dependency.

## 4. Caching Strategy

-   **Requirement:** Cache latency test results and the selected fastest RPC per chain.
-   **Implementation:**
    -   **Browser/Frontend:** `localStorage` is the specified target.
    -   **Backend/Node.js:** A simple JSON file will be used for persistent caching. This allows latency results and the preferred RPC endpoint to persist across application restarts. The cache file location should be configurable or default to a sensible location (e.g., within the project or a system temp directory). *Decision: Implement JSON file-based caching for Node.js.*

## 5. Constraints & Considerations

-   **Chainlist Submodule:** Requires `git submodule update --init --recursive` after cloning or pulling updates. The `generate-json.js` script needs to be run periodically (manual trigger or part of a build step) to keep the RPC list fresh.
-   **Latency Testing:** The chosen RPC method for testing (e.g., `eth_blockNumber`) should be lightweight and supported by most nodes. Network conditions can heavily influence results. Testing needs timeouts and error handling.
-   **Free RPCs Only:** Logic must filter Chainlist data to include only free endpoints. The definition of "free" might need clarification based on Chainlist's data structure.
-   **`bun` Usage:** Adhere to user's instruction to use `bun run` for executing TypeScript files and `bun install` for dependencies.
