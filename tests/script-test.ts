import { HandlerConstructorConfig } from "../dist/cjs/src/handler";
import { RPCHandler } from "../dist/cjs/src/rpc-handler";

const config: HandlerConstructorConfig = {
  networkId: 100,
  autoStorage: false,
};

async function main() {
  const handler = new RPCHandler(config);
  const provider = await handler.getFastestRpcProvider();
  console.trace(provider);

  if (!provider) {
    console.error("Provider not available");
    return;
  } else {
    console.log("Provider available");
    console.log("Block number:", (await provider.getBlockNumber()).toString());
  }
}

main();
