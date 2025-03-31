// Directly import the JSON data as a fallback.
// Adjust path to point one level up from src/
import fallbackWhitelistJson from "../rpc-whitelist.json" with { type: "json" };

// Define a logger type
type LoggerFn = (level: "debug" | "info" | "warn" | "error", message: string, ...optionalParams: any[]) => void;

// Interface for the structure of rpc-whitelist.json
interface RpcWhitelist {
  rpcs: {
    [chainId: string]: string[]; // chainId as string key, array of URLs
  };
}

// Cast the imported JSON to the defined interface
const fallbackJsonData = fallbackWhitelistJson as RpcWhitelist;

export class ChainlistDataSource {
  private whitelistData: { chainId: number; rpcUrls: string[] }[] = [];
  private initialized = false;
  private log: LoggerFn;

  // Accept optional initial data and logger
  constructor(logger?: LoggerFn, initialData?: RpcWhitelist) {
    this.log = logger || (() => {});
    // Use initialData if provided, otherwise use the imported fallback
    const sourceData = initialData || fallbackJsonData;
    this.loadData(sourceData); // Pass the data source to loadData
  }

  // Modify loadData to accept the data source
  private loadData(jsonData: RpcWhitelist): void {
    if (this.initialized) {
      return;
    }
    this.log("info", "Initializing whitelist data...");
    try {
      // Ensure rpcs object exists
      jsonData.rpcs = jsonData.rpcs || {};
      // Transform the provided data directly
      this.whitelistData = Object.entries(jsonData.rpcs).map(([chainIdStr, urls]) => ({
        chainId: parseInt(chainIdStr, 10),
        rpcUrls: urls.filter((url) => typeof url === "string" && url.startsWith("https://") && !url.includes("${")), // Pre-filter valid URLs
      }));

      this.initialized = true;
      this.log("info", `Successfully initialized whitelist data for ${this.whitelistData.length} chains.`);
    } catch (error) {
      this.log("error", "Failed to process RPC whitelist data:", error);
      this.whitelistData = [];
      this.initialized = true; // Prevent retries on error
    }
  }

  // Make getRpcUrls synchronous
  getRpcUrls(chainId: number): string[] {
    const chainEntry = this.whitelistData.find((c) => c.chainId === chainId);
    if (!chainEntry) {
      this.log("warn", `No whitelisted RPCs found for chainId: ${chainId}`);
      return [];
    }
    return chainEntry.rpcUrls;
  }

  // Make getAllChainIds synchronous
  getAllChainIds(): number[] {
    return this.whitelistData.map((chain) => chain.chainId);
  }
}
