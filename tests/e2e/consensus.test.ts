import { RPCHandler } from "../../dist";
import { RequestPayload } from "../../dist/types/rpc-service";
import { e2eConfig } from "./config";

describe("RPCHandler Security E2E Tests", () => {
  let handler: RPCHandler;

  beforeAll(() => {
    handler = new RPCHandler(e2eConfig);
  });

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

    const receiptExpected = {
      blockHash: "0xb290cc3c4239b9c3935da148dd1e37c5bb628ebfa4e624f38e5f2e2a1a8c31a9",
      blockNumber: "0x24a650d",
      contractAddress: null,
      cumulativeGasUsed: "0x44acf7",
      effectiveGasPrice: "0x39d10688",
      from: "0xae5d1f192013db889b1e2115a370ab133f359765",
      gasUsed: "0xb411",
      logs: [
        {
          address: "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d",
          blockHash: "0xb290cc3c4239b9c3935da148dd1e37c5bb628ebfa4e624f38e5f2e2a1a8c31a9",
          blockNumber: "0x24a650d",
          data: "0x000000000000000000000000000000000000000000000004e953dbfb0a640000",
          logIndex: "0x45",
          removed: false,
          topics: [
            "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
            "0x000000000000000000000000ae5d1f192013db889b1e2115a370ab133f359765",
            "0x0000000000000000000000003a23f943181408eac424116af7b7790c94cb97a5",
          ],
          transactionHash: "0xa49258109b0b89a6fdcf2367c6465842c785e167d8a5f57a88039fdc66bd513c",
          transactionIndex: "0x11",
        },
      ],
      logsBloom:
        "0x00000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000010000200000000000000000000100000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000020000000000000000000000000000000000000000000000000000000020000000000000000010000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000",
      status: "0x1",
      to: "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d",
      transactionHash: "0xa49258109b0b89a6fdcf2367c6465842c785e167d8a5f57a88039fdc66bd513c",
      transactionIndex: "0x11",
      type: "0x2",
    };

    const transactionConsensusResponse = await handler.security.consensusCall(transactionReceiptPayload, "0.33"); // reduce flakiness for CI
    expect(transactionConsensusResponse).toEqual(receiptExpected);
  }, 36000);
});
