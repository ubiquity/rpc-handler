// Directly import the JSON data using an import attribute.
import whitelistJson from "./rpc-whitelist.json" with { type: "json" };
// Remove fs and path imports as they are Node.js specific
// import * as fs from "fs/promises";
// import * as path from "path";

// Interface for the structure of rpc-whitelist.json
interface RpcWhitelist {
  rpcs: {
    [chainId: string]: string[]; // chainId as string key, array of URLs
  };
}

// Cast the imported JSON to the defined interface
const jsonData = whitelistJson as RpcWhitelist;

export class ChainlistDataSource {
  // Store data in the format { chainId: number, rpcUrls: string[] }
  private whitelistData: { chainId: number; rpcUrls: string[] }[] = [];
  private initialized = false;

  constructor() {
    // Initialize data directly in the constructor since import is synchronous
    this.loadData();
  }

  // Make loadData synchronous as file reading is removed
  private loadData(): void {
    if (this.initialized) {
      return;
    }
    try {
      // Transform the imported data directly
      this.whitelistData = Object.entries(jsonData.rpcs).map(([chainIdStr, urls]) => ({
        chainId: parseInt(chainIdStr, 10),
        rpcUrls: urls.filter((url) => typeof url === "string" && url.startsWith("https://") && !url.includes("${")), // Pre-filter valid URLs
      }));

      this.initialized = true;
      console.log(`Successfully initialized whitelist data for ${this.whitelistData.length} chains.`);
    } catch (error) {
      console.error("Failed to process imported RPC whitelist data:", error);
      this.whitelistData = [];
      this.initialized = true; // Prevent retries on error
    }
  }

  // Make getRpcUrls synchronous
  getRpcUrls(chainId: number): string[] {
    // Data is loaded in constructor, no need for await
    // await this.loadData();

    const chainEntry = this.whitelistData.find((c) => c.chainId === chainId);

    if (!chainEntry) {
      console.warn(`No whitelisted RPCs found for chainId: ${chainId}`);
      return [];
    }

    // Return the pre-filtered URLs
    return chainEntry.rpcUrls;
  }

  // Make getAllChainIds synchronous
  getAllChainIds(): number[] {
    // Data is loaded in constructor, no need for await
    // await this.loadData();
    return this.whitelistData.map((chain) => chain.chainId);
  }
}
