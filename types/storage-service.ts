import { NetworkId } from "./handler";

export class StorageService {
  static getLatencies(env: string, networkId: NetworkId): Record<string | number, number> {
    if (env === "browser") {
      if (this.bypassForTests()) return {};
      const latencies: Record<string, number> = JSON.parse(localStorage.getItem("rpcLatencies") || "{}");
      return Object.keys(latencies).reduce((acc: Record<string, number>, key) => {
        if (key.startsWith(`${networkId}__`)) {
          acc[key] = latencies[key];
        }
        return acc;
      }, {});
    }

    return {};
  }

  static getRefreshLatencies(env: string): number {
    if (env === "browser") {
      if (this.bypassForTests()) return 0;
      const refresh = JSON.parse(localStorage.getItem("refreshLatencies") || "0");

      if (typeof refresh === "number") {
        return refresh;
      } else {
        return 0;
      }
    }
    return 0;
  }
  static setLatencies(env: string, latencies: Record<string | number, number>): void {
    if (env === "browser") {
      if (this.bypassForTests()) return;
      localStorage.setItem("rpcLatencies", JSON.stringify(latencies));
    }
  }
  static setRefreshLatencies(env: string, refreshLatencies: number): void {
    if (env === "browser") {
      if (this.bypassForTests()) return;
      localStorage.setItem("refreshLatencies", JSON.stringify(refreshLatencies));
    }
  }

  // This method is only used for env detection testing
  static bypassForTests() {
    if (typeof localStorage === "undefined") {
      console.log("Passing test because localStorage is not defined.");
      return true;
    }
  }
}
