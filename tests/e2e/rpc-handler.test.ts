import { RPCHandler } from "../../dist";
import { e2eConfig } from "./config";

describe("RPCHandler E2E Tests", () => {
  let handler: RPCHandler;

  beforeAll(async () => {
    handler = new RPCHandler(e2eConfig);
    await handler.getFastestRpcProvider();
  }, 15000);

  it("should get the fastest RPC provider", async () => {
    const provider = await handler.getFastestRpcProvider();
    expect(provider).toBeDefined();
  }, 15000);

  it("should return non-null latencies", async () => {
    const latencies = handler.getLatencies();
    expect(latencies).toBeDefined();
    expect(Object.keys(latencies).length).toBeGreaterThan(0);
    expect(Object.values(latencies).every((latency) => !!latency && latency > 0)).toBeTruthy();
  }, 15000);

  it("should return non-null network RPCs", async () => {
    const networkRpcs = handler.getNetworkRpcs();
    expect(networkRpcs).toBeDefined();
    expect(networkRpcs.length).toBeGreaterThan(0);
    expect(networkRpcs.every((rpc) => !!rpc.url)).toBeTruthy();
  }, 15000);

  it("should return non-null runtime RPCs", async () => {
    const runtimeRpcs = handler.getRuntimeRpcs();
    expect(runtimeRpcs).toBeDefined();
    expect(runtimeRpcs.length).toBeGreaterThan(0);
    expect(runtimeRpcs.every((rpc) => !!rpc)).toBeTruthy();
  }, 15000);
});
