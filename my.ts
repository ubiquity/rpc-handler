import getRPCHandler from "./dist/index.js";
import { HandlerConstructorConfig } from "./dist/types/src";

(async () => {
  const RPCHandler = await getRPCHandler();

  const config: HandlerConstructorConfig = {
    networkId: 1,
  };

  const handler = new RPCHandler(config);

  console.log(handler);
})().catch(console.error);
