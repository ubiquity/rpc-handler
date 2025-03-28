# Project Brief: RPC Handler Rewrite

## 1. Overview

This project involves a complete rewrite of the existing `rpc-handler`. The primary goal is to create an intelligent RPC management system that abstracts away the specifics of individual RPC endpoints from the user.

## 2. Core Requirements

- **Automatic RPC Selection:** The handler must automatically select the fastest available *free* RPC endpoint for a given blockchain network before each request.
- **Chainlist Integration:** Utilize the list of RPC endpoints provided by Chainlist ([https://chainlist.org/](https://chainlist.org/)) as the source for available endpoints.
- **Performance Testing:** Implement a mechanism to test the latency of available RPC endpoints. This test should run periodically (e.g., once per session or at a configurable interval) to identify the current fastest endpoint.
- **Caching:** Use caching (localStorage for frontend, suitable backend storage otherwise) to store the results of performance tests and the currently selected fastest RPC for each chain. This avoids re-testing for every request.
- **Abstraction:** Provide a simple interface for users to make RPC calls without needing to manage or specify individual RPC URLs. The handler should manage the underlying endpoint selection transparently.
- **Focus on Free RPCs:** Prioritize and exclusively use RPCs marked as free on Chainlist.

## 3. Goals

- Improve reliability by automatically switching away from slow or unresponsive RPCs.
- Simplify the developer experience by abstracting RPC management.
- Optimize request latency by dynamically selecting the best-performing endpoint.

## 4. Scope

- Rewrite the core logic of the `rpc-handler`.
- Integrate with Chainlist data (potentially fetching/updating the list).
- Implement latency testing logic.
- Implement caching strategy.
- Define a clear API for the new handler.

## 5. Non-Goals (Initially)

- Support for paid/authenticated RPC endpoints.
- Complex load balancing strategies beyond simple fastest-endpoint selection.
- UI components for managing RPCs (focus is on the backend/logic).
