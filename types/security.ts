import { RPCHandler } from "./rpc-handler";
import { JsonRpcResponseData, RequestPayload, RpcPromiseResult, RPCService } from "./rpc-service";

export class Security {
  private _hadToStringify = false;

  constructor(
    private _rpcHandler: RPCHandler,
    private _rpcService: RPCService
  ) {}

  /**
   * @DEV `quorumThreshold` is a template literal to enforce at the type level that the value is a decimal
   * between 0 and 1 without the need for external packages or custom classes which burden the user and codebase.
   *
   * @DESCRIPTION Similar to `Ethers.FallbackProvider`, this method validates the response from multiple nodes and returns true if the response is consistent across all nodes above the quorum threshold.
   *
   * @EXAMPLE
   * - `consensusCall({ method: "eth_blockNumber", params: [] }, "0.5")`
   * - `consensusCall({ method: "eth_getTransactionByHash", params: ["0x1234"] }, "0.8")`
   */
  public async consensusCall<TMethodReturnData = unknown>(requestPayload: RequestPayload, quorumThreshold: `0.${number}`): Promise<TMethodReturnData> {
    let runtimeRpcs = this._rpcHandler.getRuntimeRpcs();
    if (runtimeRpcs.length === 0) {
      await this._rpcHandler.testRpcPerformance();
      runtimeRpcs = this._rpcHandler.getRuntimeRpcs();
    }

    if (runtimeRpcs.length === 1) {
      throw new Error("Only one RPC available, could not reach consensus");
    }

    const results: RpcPromiseResult[] = [];

    for (const rpc of runtimeRpcs) {
      try {
        const result = await this._rpcService.makeRpcRequest(requestPayload, rpc);
        if (result.success) {
          results.push(result);
        }
      } catch (err) {
        this._rpcHandler.log("error", `Failed to reach endpoint ${rpc}.\n ${String(err)}`);
      }
    }

    // calculate the quorum based on the number of results
    // we opt for results.length instead of runtimeRpcs.length to account for failed requests
    const quorum = Math.ceil(results.length * parseFloat(quorumThreshold));

    if (quorum === 0) {
      throw new Error("Quorum is 0, could not reach consensus");
    }

    const rpcResults = results.map((res) => res.data?.result);
    // an object whose keys are the rpc responses and values are the number of times they appeared
    const matchingResults = this._countRpcResults(rpcResults);

    // find the most common rpc response
    const mostCommonResult = Object.keys(matchingResults).reduce((a, b) => (matchingResults[a] > matchingResults[b] ? a : b));

    // if the most common rpc response appears more than the quorum, return it
    if (matchingResults[mostCommonResult] >= quorum) {
      return this._hadToStringify ? JSON.parse(mostCommonResult) : (mostCommonResult as unknown as TMethodReturnData);
    }

    this._rpcHandler.log(
      "error",
      `Could not reach consensus despite ${results.length} RPCs.\nA total of ${quorum} responses were required, but the most common result appeared ${matchingResults[mostCommonResult]} times.`
    );

    throw new Error(`Could not reach consensus. Most common result: ${mostCommonResult}`);
  }

  private _countRpcResults(results: (JsonRpcResponseData["result"] | undefined | string)[]): Record<string, number> {
    return results.reduce(
      (acc, val) => {
        val = this._sortObjectAndStringify(val);
        if (!val) return acc;

        if (!acc[val]) {
          acc[val] = 1;
        } else {
          acc[val]++;
        }

        return acc;
      },
      {} as Record<string, number>
    );
  }

  private _sortObjectAndStringify(val: JsonRpcResponseData["result"] | undefined | string): string | undefined {
    if (val === undefined || val === null) return;
    if (typeof val !== "string") {
      const sortedVal = sortObject(val as Record<string, unknown>);
      val = JSON.stringify(sortedVal);
      this._hadToStringify = true;
    }

    function sortObject(obj: Record<string, unknown>): Record<string, unknown> {
      return Object.keys(obj)
        .sort()
        .reduce(
          (acc, key) => {
            const value = obj[key];
            if (value && typeof value === "object" && !Array.isArray(value)) {
              acc[key] = sortObject(value as Record<string, unknown>);
            } else if (Array.isArray(value)) {
              acc[key] = value.map((item) => (item && typeof item === "object" ? sortObject(item as Record<string, unknown>) : item));
            } else {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, unknown>
        );
    }
    return val;
  }
}
