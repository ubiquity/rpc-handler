import { HandlerConstructorConfig, RPCHandler } from "../dist";
import { RequestPayload } from "../dist/types/rpc-service";

/**
 * A test script to ensure that the module can be imported and used correctly
 * This script is not meant to be run in the test suite
 */

(async () => {
  // a hook that loads the correct module based on the environment
  // not required but a good to have if main/module entry is causing issues

  const config: HandlerConstructorConfig = {
    networkId: "100",
    rpcTimeout: 1500,
    autoStorage: false,
    cacheRefreshCycles: 10,
    networkName: null,
    networkRpcs: null,
    runtimeRpcs: null,
    proxySettings: {
      retryCount: 3,
      retryDelay: 500,
      logTier: "info",
      logger: null,
      strictLogs: false,
      moduleName: "[RPCHandler-Script-Test] -> ",
    },
  };

  const handler = new RPCHandler(config);

  const blockByNumberPayload: RequestPayload = {
    jsonrpc: "2.0",
    method: "eth_getBlockByNumber",
    params: ["latest", false],
    id: 1,
    headers: {
      "Content-Type": "application/json",
    },
  };

  const transactionReceiptPayload: RequestPayload = {
    jsonrpc: "2.0",
    method: "eth_getTransactionReceipt",
    params: ["0xa49258109b0b89a6fdcf2367c6465842c785e167d8a5f57a88039fdc66bd513c"],
    id: 1,
    headers: {
      "Content-Type": "application/json",
    },
  };

  const blockConsensusResponse = await handler.consensusCall(blockByNumberPayload, "0.5");
  console.log("Block Consensus Response: ", blockConsensusResponse);

  const transactionConsensusResponse = await handler.consensusCall(transactionReceiptPayload, "0.5");
  console.log("Transaction Consensus Response: ", transactionConsensusResponse);

  process.exit(0);
})().catch(console.error);
