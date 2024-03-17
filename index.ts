async function getRPCHandler() {
  let modulePath;
  if (typeof window !== "undefined") {
    modulePath = "./esm/src/handler/rpc-handler.js";
  } else {
    modulePath = "./cjs/src/handler/rpc-handler.js";
  }

  const { RPCHandler } = await import(modulePath);

  return RPCHandler;
}
export default getRPCHandler;
