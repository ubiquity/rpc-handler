import { HandlerConstructorConfig } from "../dist/cjs/src/handler";
import { RPCHandler } from "../dist/cjs/src/rpc-handler";

const config: HandlerConstructorConfig = {
  autoStorage: false,
  cacheRefreshCycles: 5,
};

async function main() {
  const networkId = 1;
  const handler = new RPCHandler(networkId, config);
  return await handler.getFastestRpcProvider();
}

main().then(console.log).catch(console.error);
