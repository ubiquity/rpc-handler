import { RPCHandler } from "../dist/tests/mocks/rpc-handler";
import { testConfig } from "./rpc-handler.test";

describe("Browser env detection", () => {
  let originalGlobalThis: typeof globalThis;

  beforeEach(() => {
    jest.resetModules();
    originalGlobalThis = { ...globalThis };
  });

  afterEach(() => {
    Object.assign(globalThis, originalGlobalThis);
    jest.clearAllMocks();
  });

  describe("In a browser environment", () => {
    beforeEach(() => {
      // @ts-expect-error globalThis
      const windowMock: Window & typeof globalThis = {
        ...globalThis,
        name: "Window",
      };
      Object.defineProperty(global, "window", {
        value: windowMock,
        configurable: true,
      });
    });
    it("should detect a browser environment", () => {
      const handler = new RPCHandler(testConfig);
      expect(handler["_env"]).toBe("browser");
    });
  });

  describe("In a node environment", () => {
    beforeEach(() => {
      delete (global as any).window;
    });
    it("should detect a node environment", () => {
      const handler = new RPCHandler(testConfig);
      expect(handler["_env"]).toBe("node");
    });
  });
});
