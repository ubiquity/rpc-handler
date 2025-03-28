# Progress: RPC Handler Rewrite

## 1. Current Status (March 28, 2025)

- **Phase:** Implementation
- **Overall Progress:** 80% (Core components implemented)

## 2. What Works

- Core documentation structure created.
- Project configuration (`package.json`, `tsconfig.json`) set up.
- Chainlist RPC data generated (`lib/chainlist/out/rpcs.json`).
- `ChainlistDataSource` implemented to load RPC data.
- `CacheManager` implemented with support for `localStorage` (browser) and JSON file (Node.js).
- `LatencyTester` implemented using native `fetch` with timeouts.
- `RpcSelector` implemented to find the fastest RPC using cache and testing.
- `RpcHandler` (main API) implemented, integrating all components and providing `send` method with fallback logic.
- `src/index.ts` created as the library entry point.
- Initial tests using `bun test` added for `LatencyTester`, `RpcSelector`, `RpcHandler`, and `readContract` helper (all passing).
- `readContract` helper function added for contract interactions using `viem`.
- Switched from testing all Chainlist RPCs to using a curated `src/rpc-whitelist.json`.
- Latency testing enhanced to check Permit2 bytecode and `eth_syncing`.
- Cache stores detailed `LatencyTestResult` including failure status/reasons.
- `README.md` created with usage examples.

## 3. What's Next (Immediate Tasks)

- **RPC Selection Enhancement:** ✅ Improved RPC selection to handle nodes with incorrect Permit2 bytecode more gracefully:
  - Added support for using RPCs with wrong bytecode for basic operations
  - Implemented priority system: ok > wrong_bytecode > syncing
  - Added detailed logging of bytecode mismatches for debugging
- **Edge Cases:** ✅ Added handling for chain upgrades and reorgs that might affect Permit2 bytecode
- **Documentation:** ✅ Updated all docs to reflect new RPC selection behavior
- **Code Comments:** Add more detailed comments explaining bytecode check purpose
- **Whitelist Maintenance:** Continue monitoring RPC reliability across chains

## 4. Known Issues / Blockers

- Test coverage is not exhaustive.
- The initial `rpc-whitelist.json` may need expansion/refinement for broader chain support.
- ✅ Issue with strict Permit2 bytecode checks resolved by implementing priority-based RPC selection.

## 5. Open Questions / Decisions (Future)

- Finalize configuration options (cache path, timeouts).
- Refine the strategy for handling/retrying failed RPCs beyond the current single fallback.
- Determine best approach for library distribution (e.g., publishing to npm).
- Consider adding support for `eth_sendRawTransaction` (requires handling nonces, gas, etc.).
