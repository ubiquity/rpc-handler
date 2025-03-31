# Product Context: Permit2 RPC Proxy Service (Deno Deploy)

## 1. Problem Statement

Developers building decentralized applications (dApps) often need to interact with various blockchain networks via RPC (Remote Procedure Call) endpoints directly from the browser. This presents several challenges:

- **CORS Issues:** Browsers enforce Cross-Origin Resource Sharing (CORS) policies, preventing frontend applications from directly calling many public RPC endpoints that lack permissive CORS headers. This forces developers to route requests through their own backend, adding complexity.
- **Reliability:** Public RPC endpoints can be unreliable, experiencing downtime, rate limiting, or performance degradation. Building robust fallback logic on the frontend is difficult.
- **Performance:** The latency of RPC endpoints varies significantly. Frontend applications often cannot easily determine the fastest available endpoint for the user.
- **Complexity:** Managing multiple RPC URLs per chain and implementing selection/fallback logic directly in the frontend increases bundle size and development effort.

## 2. Proposed Solution

The Permit2 RPC Proxy Service, deployed on Deno Deploy, solves these problems by providing an intelligent, CORS-friendly intermediary:

- **Solves CORS:** Acts as a backend proxy, eliminating browser CORS restrictions by handling the upstream RPC calls server-side and returning responses with appropriate CORS headers.
- **Abstracts Complexity:** Frontend applications only need to know the single proxy service URL (`https://<project>.deno.dev/rpc/{chainId}`). The service handles all the underlying RPC selection, testing, and fallback.
- **Smart Selection:** Internally uses the proven `Permit2RpcManager` logic:
    - Tests RPCs from `src/rpc-whitelist.json` for latency, sync status, and Permit2 bytecode.
    - Prioritizes selection: `ok` > `wrong_bytecode` > `syncing`.
    - Selects the fastest within each priority tier.
- **Enhanced Reliability:** Automatically routes requests through the optimal available endpoint and transparently handles fallback if an endpoint fails.
- **Server-Side Caching:** Uses Deno KV to cache test results, improving performance for subsequent requests without relying on browser storage.

## 3. Target Users

- **Frontend dApp Developers:** Primarily benefits developers building browser-based applications who need reliable, performant, and CORS-compliant access to EVM chains.
- **Developers needing a simple RPC proxy:** Anyone who wants to abstract away RPC management behind a simple HTTP endpoint.

## 4. User Experience Goals (for the *end-user* of the dApp using this proxy)

- **Responsiveness:** Faster dApp interactions due to optimized RPC selection and server-side caching.
- **Reliability:** Fewer transaction failures or errors caused by unreliable public RPCs.
- **Seamlessness:** Users are unaware of the underlying RPC complexity; the dApp simply works.

## 5. User Experience Goals (for the *developer* using this proxy)

- **Simplicity:** Easy integration via a single HTTP endpoint format or the optional client SDK (`@pavlovcik/permit2-rpc-client`).
- **Reduced Boilerplate:** Eliminates the need for frontend CORS workarounds, RPC management logic, and manual `fetch` calls (when using the SDK).
- **Improved Performance:** Leverages server-side intelligence for optimal RPC routing and supports batch requests.
- **Reliability:** Offloads RPC fallback complexity to the service.
