# Project Brief: Permit2 RPC Proxy Service (Deno Deploy)

## 1. Overview

This project provides an intelligent, CORS-friendly RPC proxy service deployed on Deno Deploy. It leverages the core logic of the original `permit2-rpc-manager` to automatically select the fastest, valid RPC endpoint from a curated whitelist for incoming JSON-RPC requests.

## 2. Core Requirements

- **Automatic RPC Selection:** The manager must automatically select the fastest _valid_ RPC endpoint from a curated whitelist for a given blockchain network before each request.
- **Whitelisting:** Use a configurable `src/rpc-whitelist.json` file as the source for potential RPC endpoints.
- **Validity & Performance Testing:** Implement a mechanism to test whitelisted RPCs for latency, sync status (`eth_syncing`), and specific contract bytecode (`eth_getCode` for Permit2). This test runs when the cache is stale or missing.
- **Caching:** Use Deno KV to store detailed latency test results (including status/errors) and the currently selected fastest valid RPC for each chain.
- **Abstraction:** The service itself acts as the abstraction layer, providing a simple HTTP endpoint (`POST /rpc/{chainId}`). The underlying `send` and `readContract` logic from the original manager is used internally.
- **Fallback:** Implement robust fallback by iterating through the ranked list of RPCs upon failure.
- **CORS Handling:** Explicitly handle CORS preflight requests and add necessary headers for browser compatibility.
- **Deployment:** Automated deployment to Deno Deploy via GitHub Actions.

## 3. Goals

- Provide a reliable, performant, and CORS-friendly RPC endpoint for dApps.
- Simplify frontend development by handling RPC selection and fallback server-side.
- Optimize request latency by dynamically selecting the best-performing upstream RPC.
- Automate deployment for continuous delivery.

## 4. Scope

- Create a Deno HTTP server (`src/deno-server.ts`) to act as the proxy.
- Adapt the core logic (`Permit2RpcManager`, `RpcSelector`, `LatencyTester`, `CacheManager`, `ChainlistDataSource`) to the Deno runtime.
- Implement caching using Deno KV.
- Implement CORS handling.
- Set up automated deployment using GitHub Actions and Deno Deploy.
- Update documentation to reflect the service architecture.

## 5. Non-Goals

- Exposing library functions directly (focus is on the HTTP service).
- Support for paid/authenticated RPC endpoints.
- Complex load balancing beyond the existing ranked selection + round-robin.
- UI components for managing the service.
- Adapting existing tests (unless specifically requested).
