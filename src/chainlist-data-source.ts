import * as fs from "fs/promises";
import * as path from "path";

// Interface for the structure of rpc-whitelist.json
interface RpcWhitelist {
  rpcs: {
    [chainId: string]: string[]; // chainId as string key, array of URLs
  };
}

// Update path to the new whitelist file
const RPC_DATA_PATH = path.join(
  __dirname,
  // '..', // No longer need to go up if whitelist is in src
  "rpc-whitelist.json"
);

export class ChainlistDataSource {
  // Store data in the format { chainId: number, rpcUrls: string[] }
  private whitelistData: { chainId: number; rpcUrls: string[] }[] = [];
  private initialized = false;

  constructor() {}

  private async loadData(): Promise<void> {
    if (this.initialized) {
      return;
    }
    try {
      console.log(`Loading RPC whitelist data from: ${RPC_DATA_PATH}`);
      const rawData = await fs.readFile(RPC_DATA_PATH, "utf-8");
      const jsonData = JSON.parse(rawData) as RpcWhitelist;

      // Transform the loaded data into the desired internal format
      this.whitelistData = Object.entries(jsonData.rpcs).map(([chainIdStr, urls]) => ({
        chainId: parseInt(chainIdStr, 10),
        rpcUrls: urls.filter((url) => typeof url === "string" && url.startsWith("https://") && !url.includes("${")), // Pre-filter valid URLs
      }));

      this.initialized = true;
      console.log(`Successfully loaded whitelist data for ${this.whitelistData.length} chains.`);
    } catch (error) {
      console.error("Failed to load or parse RPC whitelist data:", error);
      this.whitelistData = [];
      this.initialized = true; // Prevent retries on error
    }
  }

  async getRpcUrls(chainId: number): Promise<string[]> {
    await this.loadData(); // Ensure data is loaded

    const chainEntry = this.whitelistData.find((c) => c.chainId === chainId);

    if (!chainEntry) {
      console.warn(`No whitelisted RPCs found for chainId: ${chainId}`);
      return [];
    }

    // Return the pre-filtered URLs
    return chainEntry.rpcUrls;
  }

  async getAllChainIds(): Promise<number[]> {
    await this.loadData();
    return this.whitelistData.map((chain) => chain.chainId);
  }
}
