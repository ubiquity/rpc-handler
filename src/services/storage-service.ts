export class StorageService {
  static getLatencies(env: string): Record<string | number, number> {
    if (env === "browser") {
      return JSON.parse(localStorage.getItem("rpcLatencies") || "{}");
    }

    return {};
  }

  static getRefreshLatencies(env: string): number {
    if (env === "browser") {
      return JSON.parse(localStorage.getItem("refreshLatencies") || "0");
    }
    return 0;
  }

  static setLatencies(env: string, latencies: Record<string | number, number>): void {
    if (env === "browser") {
      localStorage.setItem("rpcLatencies", JSON.stringify(latencies));
    }
  }

  static setRefreshLatencies(env: string, refreshLatencies: number): void {
    if (env === "browser") {
      localStorage.setItem("refreshLatencies", JSON.stringify(refreshLatencies));
    }
  }
}
