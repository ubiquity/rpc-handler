import { HandlerConstructorConfig, RPCHandler } from "../dist/";
import getRPCHandler from "../dist/index.js";

(async () => {
  // a hook that loads the correct module based on the environment
  // not required but a good to have if main/module entry is causing issues
  const RPCHandler = await getRPCHandler();

  const config: HandlerConstructorConfig = {
    networkId: 1,
    rpcTimeout: 1500,
  };

  const handler: RPCHandler = new RPCHandler(config);

  await handler.getFastestRpcProvider();

  const latencies = handler.getLatencies();

  const provider = handler.getFastestRpcProvider();

  console.log(provider);
  console.log("=====================================");
  console.log(latencies);
  process.exit(0);
})().catch(console.error);
