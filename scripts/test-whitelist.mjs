import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const ourWhitelistPath = path.join(projectRoot, 'src/rpc-whitelist.json');

// Chains to specifically test (add important ones)
const CRITICAL_CHAINS = [1, 10, 100, 137, 42161]; // Example: Mainnet, Optimism, Gnosis, Polygon, Arbitrum
const RPCS_PER_CHAIN_TO_TEST = 3; // Test a few RPCs per critical chain for speed
const REQUEST_TIMEOUT = 5000; // 5 seconds

async function testRpcConnectivity(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  const requestBody = JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 1 });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(`RPC error ${data.error.code}: ${data.error.message}`);
    }
    if (!data.result) {
        throw new Error('No result field in response');
    }
    // console.log(`OK: ${url} - Chain ID: ${parseInt(data.result, 16)}`);
    return true; // Success
  } catch (error) {
    console.warn(`FAIL: ${url} - ${error.message}`);
    return false; // Failure
  } finally {
      clearTimeout(timeoutId); // Ensure timeout is cleared
  }
}

async function testWhitelist() {
  console.log('Starting whitelist connectivity test...');
  let failedChains = 0;

  try {
    // Read our updated rpc-whitelist.json
    console.log(`Reading whitelist from: ${ourWhitelistPath}`);
    const ourWhitelistRaw = await fs.readFile(ourWhitelistPath, 'utf-8');
    const ourWhitelist = JSON.parse(ourWhitelistRaw);
    console.log(`Whitelist contains ${Object.keys(ourWhitelist.rpcs || {}).length} chains.`);

    for (const chainIdStr of Object.keys(ourWhitelist.rpcs)) {
      const chainId = parseInt(chainIdStr, 10);
      if (!CRITICAL_CHAINS.includes(chainId)) {
        continue; // Skip non-critical chains for this basic test
      }

      console.log(`\nTesting critical chain ${chainId}...`);
      const rpcUrls = ourWhitelist.rpcs[chainIdStr] || [];
      const urlsToTest = rpcUrls.slice(0, RPCS_PER_CHAIN_TO_TEST); // Test the first few

      if (urlsToTest.length === 0) {
        console.warn(`  No RPCs listed for critical chain ${chainId}.`);
        failedChains++;
        continue;
      }

      const testPromises = urlsToTest.map(url => testRpcConnectivity(url));
      const results = await Promise.all(testPromises);

      const successfulTests = results.filter(success => success).length;
      console.log(`  Tested ${urlsToTest.length} RPCs for chain ${chainId}: ${successfulTests} succeeded.`);

      if (successfulTests === 0) {
        console.error(`  ERROR: All tested RPCs failed for critical chain ${chainId}!`);
        failedChains++;
      }
       // Optional: Add a threshold, e.g., fail if less than 50% succeed?
       // else if (successfulTests / urlsToTest.length < 0.5) {
       //    console.error(`  ERROR: Less than 50% of tested RPCs succeeded for critical chain ${chainId}!`);
       //    failedChains++;
       // }
    }

    if (failedChains > 0) {
      console.error(`\nWhitelist test failed: ${failedChains} critical chain(s) had issues.`);
      process.exit(1);
    } else {
      console.log('\nWhitelist connectivity test passed for critical chains.');
    }

  } catch (error) {
    console.error('Error testing whitelist:', error);
    process.exit(1); // Exit with error code
  }
}

testWhitelist();
