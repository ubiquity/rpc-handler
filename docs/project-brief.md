# Project Brief: RPC Handler Rewrite

## 1. Overview

This project involves a complete rewrite of the existing `rpc-handler`. The primary goal is to create an intelligent RPC management system that abstracts away the specifics of individual RPC endpoints from the user.

## 2. Core Requirements

- **Automatic RPC Selection:** The handler must automatically select the fastest _valid_ RPC endpoint from a curated whitelist for a given blockchain network before each request.
- **Whitelisting:** Use a configurable `src/rpc-whitelist.json` file as the source for potential RPC endpoints.
- **Validity & Performance Testing:** Implement a mechanism to test whitelisted RPCs for latency, sync status (`eth_syncing`), and specific contract bytecode (`eth_getCode` for Permit2). This test runs when the cache is stale or missing.
- **Caching:** Use caching (`.rpc-cache.json` for Node.js, `localStorage` for browser) to store detailed latency test results (including status/errors) and the currently selected fastest valid RPC for each chain.
- **Abstraction:** Provide a simple `send` interface for raw JSON-RPC calls and a `readContract` helper (using `viem`) for read-only contract interactions.
- **Fallback:** Implement basic fallback to the next fastest valid RPC if the primary choice fails.

## 3. Goals

- Improve reliability by automatically switching away from slow or unresponsive RPCs.
- Simplify the developer experience by abstracting RPC management.
- Optimize request latency by dynamically selecting the best-performing endpoint.

## 4. Scope

- Rewrite the core logic into modular components (`RpcHandler`, `RpcSelector`, `LatencyTester`, `CacheManager`, `ChainlistDataSource`).
- Use a curated whitelist (`rpc-whitelist.json`) instead of full Chainlist data.
- Implement enhanced latency/validity testing logic.
- Implement caching strategy for detailed results.
- Define a clear API (`send`, `readContract`).
- Add basic unit/integration tests.

## 5. Non-Goals (Initially)

- Support for paid/authenticated RPC endpoints.
- Complex load balancing strategies beyond simple fastest-endpoint selection.
- UI components for managing RPCs (focus is on the backend/logic).
