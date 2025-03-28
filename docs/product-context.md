# Product Context: RPC Handler Rewrite

## 1. Problem Statement

Developers building decentralized applications (dApps) often need to interact with various blockchain networks via RPC (Remote Procedure Call) endpoints. Managing these endpoints presents several challenges:

- **Reliability:** Public RPC endpoints can be unreliable, experiencing downtime, rate limiting, or performance degradation. Manually switching endpoints is cumbersome and reactive.
- **Performance:** The latency of RPC endpoints varies significantly based on geographic location, server load, and network conditions. Choosing a suboptimal endpoint leads to slower application performance and a poor user experience.
- **Complexity:** Finding, configuring, and managing multiple RPC URLs for different chains adds complexity to dApp development. Developers need to handle fallback logic and endpoint selection themselves.
- **Cost:** While many free public RPCs exist, identifying and prioritizing them requires effort. Some high-performance RPCs are paid services, which might not be suitable for all projects or users.

## 2. Proposed Solution

The rewritten `rpc-handler` solves these problems by providing an intelligent, automated RPC management layer:

- **Abstract Complexity:**

  - Simple interface (`RpcHandler.send`) for making raw RPC calls
  - Helper function (`readContract`) for easy read-only contract interactions
  - Hides complex endpoint selection and validation logic
  - Transparent fallback system that adapts to operation requirements

- **Smart Selection:**

  - Tests RPCs for latency, sync status, and Permit2 bytecode
  - Priority-based selection system:
    1. Fastest fully compliant RPC (synced + correct bytecode)
    2. Fastest synced RPC with incorrect bytecode (for basic operations)
    3. Fastest syncing RPC (as last resort)
  - Different selection criteria based on operation needs
  - Detailed status tracking and error reporting

- **Enhanced Reliability:**

  - Automatically routes through optimal endpoint
  - Intelligent fallback between different RPC tiers
  - Caches test results for quick recovery
  - Handles chain upgrades and reorgs gracefully

- **Curated Sources:**
  - Uses maintained whitelist of reliable RPCs
  - Integrates with Chainlist data
  - Focus on free, public endpoints
  - Supports easy addition of custom RPCs

## 3. Target Users

- Developers building dApps who need reliable and performant access to blockchain networks.
- Backend services interacting with blockchains.
- Libraries or frameworks that require blockchain connectivity.

## 4. User Experience Goals

- **Simplicity:**

  - Minimal configuration required
  - Works out of the box for basic operations
  - Clear error messages and status reporting

- **Transparency:**

  - Optional inspection of RPC status and selection
  - Detailed logging for debugging
  - Performance metrics and error tracking
  - Visibility into fallback behavior

- **Performance:**

  - Optimized RPC routing based on operation type
  - Quick response times through caching
  - Efficient handling of node state changes
  - Minimal overhead from validation checks

- **Reliability:**
  - Reduced errors from RPC issues
  - Graceful handling of node sync states
  - Smart fallback between RPC tiers
  - Stable operation during chain events
