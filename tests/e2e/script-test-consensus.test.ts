import { RPCHandler } from "../../dist";
import { RequestPayload } from "../../dist/types/rpc-service";
import { e2eConfig } from "./config";

describe("RPCHandler Security E2E Tests", () => {
  let handler: RPCHandler;

  beforeAll(() => {
    handler = new RPCHandler(e2eConfig);
  });

  it("should get block consensus response", async () => {
    const blockByNumberPayload: RequestPayload = {
      jsonrpc: "2.0",
      method: "eth_getBlockByNumber",
      params: ["latest", false],
      id: 1,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const blockConsensusResponse = await handler.security.consensusCall(blockByNumberPayload, "0.33"); // to reduce flakiness for CI
    expect(blockConsensusResponse).toBeDefined();
    expect(blockConsensusResponse).toHaveProperty("baseFeePerGas");
    expect(blockConsensusResponse).toHaveProperty("blobGasUsed");
    expect(blockConsensusResponse).toHaveProperty("logsBloom");
  }, 36000);

  it("should get transaction consensus response", async () => {
    const transactionReceiptPayload: RequestPayload = {
      jsonrpc: "2.0",
      method: "eth_getTransactionReceipt",
      params: ["0xa49258109b0b89a6fdcf2367c6465842c785e167d8a5f57a88039fdc66bd513c"],
      id: 1,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const transactionConsensusResponse = await handler.security.consensusCall(transactionReceiptPayload, "0.33"); // reduce flakiness for CI
    expect(transactionConsensusResponse).toBeDefined();
    expect(transactionConsensusResponse).toHaveProperty("blockHash");
    expect(transactionConsensusResponse).toHaveProperty("blockNumber");
    expect((transactionConsensusResponse as { from: string }).from).toEqual("0xae5d1f192013db889b1e2115a370ab133f359765");
  }, 36000);
});
