export class StorageService {
  static getLatencies(env: string, networkId: number): Record<string | number, number> {
    if (env === "browser") {
      const latencies: Record<string, number> = JSON.parse(localStorage.getItem("rpcLatencies") || "{}");
      return Object.keys(latencies).reduce((acc: Record<string, number>, key) => {
        if (key.endsWith(`_${networkId}_`)) {
          acc[key] = latencies[key];
        }
        return acc;
      }, {});
    }

    return {};
  }

  static getRefreshLatencies(env: string): number {
    if (env === "browser") {
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
      localStorage.setItem("rpcLatencies", JSON.stringify(latencies));
    }
  }

  static setRefreshLatencies(env: string, refreshLatencies: number): void {
    if (env === "browser") {
      localStorage.setItem("refreshLatencies", JSON.stringify(refreshLatencies));
    }
  }
}
