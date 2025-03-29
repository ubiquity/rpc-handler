# Tech Context: Permit2 RPC Manager Rewrite

## 1. Core Technologies

- **Language:** TypeScript
- **Runtime Environment:** Node.js (>= 20.10.0 specified)
- **Package Manager:** `bun` (User preference for installation and running scripts)
- **Build System:** `esbuild` (for bundling JavaScript/TypeScript), `tsc` (for generating type definitions)
- **Testing Framework:** `jest` with `ts-jest`

## 2. Key Dependencies (Inferred/Planned)

- **EVM Interaction:** `@ethersproject/providers` (or potentially a successor like `ethers` v6) will likely be used for making the actual RPC calls and potentially for latency testing methods like `getBlockNumber`.
- **HTTP Client:** `axios` or `node-fetch` (or potentially `bun`'s built-in fetch) will be used for:
  - Making RPC calls during latency testing.
  - Potentially fetching Chainlist data if the local generation method isn't used (though local generation is preferred).
- **Chainlist Data:** The project includes `lib/chainlist` as a Git submodule. The plan is to utilize the `generate-json.js` script within this submodule to create a local JSON file containing the list of RPC endpoints. This file will be the primary source for the `Chainlist Data Source` component.

## 3. Development Environment & Tooling

- **Linting:** ESLint with TypeScript plugins.
- **Formatting:** Prettier.
- **Spell Checking:** CSpell.
- **Git Hooks:** Husky for pre-commit checks (linting, formatting).
- **Version Control:** Git, utilizing submodules for the Chainlist dependency.

## 4. Caching Strategy

- **Requirement:** Cache latency test results and the selected fastest RPC per chain.
- **Implementation:**
  - **Browser/Frontend:** `localStorage` is the specified target.
  - **Backend/Node.js:** A simple JSON file will be used for persistent caching. This allows latency results and the preferred RPC endpoint to persist across application restarts. The cache file location should be configurable or default to a sensible location (e.g., within the project or a system temp directory). _Decision: Implement JSON file-based caching for Node.js._

## 5. Constraints & Considerations

- **RPC Whitelist:** Uses `src/rpc-whitelist.json` to define the pool of RPCs to test per chain.
- **Latency Testing:**
  - Uses concurrent `eth_getCode` and `eth_syncing` calls
  - Exact comparison of first 13995 bytes of Permit2 bytecode
  - Returns detailed status and latency measurements
  - Network conditions may affect test results
  - Added bytecode comparison logging for debugging
- **RPC Selection Priority:**
  - `status: 'ok'`: Fully synced and correct bytecode
  - `status: 'wrong_bytecode'`: Synced but incorrect bytecode
  - `status: 'syncing'`: Still syncing
  - Within each tier, selects fastest by latency
  - Other error states exclude RPC from selection
- **`bun` Usage:**
  - Use `bun run` for executing TypeScript files
  - Use `bun install` for dependencies
  - Use `bun test` for testing
