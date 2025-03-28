# Active Context: RPC Handler Rewrite Kickoff

## 1. Current Focus

The immediate focus is on initiating the rewrite of the `rpc-handler` based on the requirements outlined in `project-brief.md` and the architecture defined in `system-patterns.md`.

## 2. Recent Activities

-   Project requirements and goals defined (`project-brief.md`).
-   Product context and problem statement established (`product-context.md`).
-   High-level system architecture and patterns designed (`system-patterns.md`).
-   Technical stack and dependencies identified (`tech-context.md`).
-   Initial documentation structure created.

## 3. Next Steps (High-Level Plan)

1.  **Setup Chainlist Data:**
    *   Confirm the output format of `lib/chainlist/generate-json.js`.
    *   Run the script to generate the initial RPC list JSON file.
    *   Create the `Chainlist Data Source` component to read and parse this file.
2.  **Implement Core Components:**
    *   Develop the `Cache Manager` (in-memory for Node.js initially, potentially `localStorage` detection later).
    *   Develop the `Latency Tester` component.
    *   Develop the `RPC Selector` logic.
    *   Develop the `Chain Manager`.
3.  **Define API Interface:** Create the main entry point/class for the handler.
4.  **Integrate Components:** Wire up all the components according to the architecture.
5.  **Testing:** Implement unit and potentially integration tests.
6.  **Refactor/Cleanup:** Remove old `rpc-handler` code and replace it with the new implementation.
7.  **Documentation Update:** Refine documentation based on implementation details.

## 4. Decisions Made & Considerations

-   **Chainlist Data Generation:** Will be run manually initially via a script/command. Frequency TBD based on usage.
-   **Caching Strategy (Node.js):** Use a JSON file for persistence across restarts. Location TBD (configurable or default).
-   **Caching Strategy (Browser):** Use `localStorage`.
-   **Error Handling:** If the primary selected RPC fails, the handler will automatically retry the request with the next fastest available RPC. The failed RPC might be temporarily deprioritized.
-   **Latency Test Method:** Tentatively `eth_blockNumber`. Needs confirmation during implementation.
-   **Environment Detection:** Required to select the correct caching strategy (`localStorage` vs. JSON file). Standard checks like `typeof window !== 'undefined'` can be used.
