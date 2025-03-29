import type { Abi } from "viem";
import { Permit2RpcManager, readContract } from "../src/index.ts";

// Minimal ABI for symbol() function
const abi: Abi = [
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

async function main() {
  // Create RPC manager instance
  const manager = new Permit2RpcManager();

  try {
    // Call readContract to get the symbol
    const symbol = await readContract({
      manager,
      chainId: 100, // Gnosis Chain
      address: "0xc6ed4f520f6a4e4dc27273509239b7f8a68d2068" as `0x${string}`,
      abi,
      functionName: "symbol",
    });

    console.log("Token Symbol:", symbol);
  } catch (error) {
    console.error("Error fetching token symbol:", error);
  }
}

main().catch(console.error);
