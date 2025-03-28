import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Define interfaces based on the expected structure of rpcs.json
// (Assuming the structure after generate-json.js runs)
interface RpcInfo {
  url: string;
  // Other potential fields like 'tracking', 'latency', etc., might exist
  // but we primarily need the URL. The script removed 'trackingDetails'.
}

interface ChainData {
  name: string;
  chainId: number;
  rpc: RpcInfo[];
  // Other chain properties like 'nativeCurrency', 'explorers', etc.
}

// Calculate __dirname in ES Module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RPC_DATA_PATH = path.join(
  __dirname,
  '..', // Go up from src to project root
  'lib',
  'chainlist',
  'out',
  'rpcs.json',
);

export class ChainlistDataSource {
  private chainData: ChainData[] = [];
  private initialized = false;

  constructor() {
    // Intentionally not loading data in constructor to allow for async initialization
  }

  private async loadData(): Promise<void> {
    if (this.initialized) {
      return;
    }
    try {
      console.log(`Loading RPC data from: ${RPC_DATA_PATH}`);
      const rawData = await fs.readFile(RPC_DATA_PATH, 'utf-8');
      this.chainData = JSON.parse(rawData) as ChainData[];
      this.initialized = true;
      console.log(`Successfully loaded data for ${this.chainData.length} chains.`);
    } catch (error) {
      console.error('Failed to load or parse Chainlist RPC data:', error);
      // Depending on requirements, might throw error or operate with empty data
      this.chainData = [];
      // Consider setting initialized to true even on error to prevent retries,
      // or implement retry logic. For now, it prevents further attempts.
      this.initialized = true;
    }
  }

  async getRpcUrls(chainId: number): Promise<string[]> {
    await this.loadData(); // Ensure data is loaded before proceeding

    const chain = this.chainData.find((c) => c.chainId === chainId);

    if (!chain || !chain.rpc) {
      console.warn(`No RPC data found for chainId: ${chainId}`);
      return [];
    }

    // Filter for valid HTTPS URLs and assume all listed are "free" as per requirement
    const httpsUrls = chain.rpc
      .map((rpc) => rpc.url)
      .filter((url) => typeof url === 'string' && url.startsWith('https://'));

    // Remove placeholder variables like ${INFURA_API_KEY} or ${ALCHEMY_API_KEY}
    const validUrls = httpsUrls.filter(url => !url.includes('${'));

    if (validUrls.length === 0) {
        console.warn(`No valid HTTPS RPC URLs found for chainId: ${chainId} after filtering.`);
    }

    return validUrls;
  }

  async getAllChainIds(): Promise<number[]> {
    await this.loadData();
    return this.chainData.map(chain => chain.chainId);
  }
}

// Example usage (optional, for testing)
/*
async function test() {
    const dataSource = new ChainlistDataSource();
    const ethRpcs = await dataSource.getRpcUrls(1);
    console.log("Ethereum RPCs:", ethRpcs.slice(0, 5)); // Log first 5
    const allChainIds = await dataSource.getAllChainIds();
    console.log("Total chains loaded:", allChainIds.length);
}
test();
*/
