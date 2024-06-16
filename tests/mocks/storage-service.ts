import { ChainId } from "./handler";

const LOCALSTORAGE_NOT_DEFINED = "Passing because localStorage is not available";

export class StorageService {
  static getLatencies(env: string, networkId: ChainId): Record<string | number, number> {
    if (env === "browser") {
      if (typeof localStorage === "undefined") {
        console.log(LOCALSTORAGE_NOT_DEFINED);
        return {};
      }
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
      if (typeof localStorage === "undefined") {
        console.log(LOCALSTORAGE_NOT_DEFINED);
        return 0;
      }
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
      if (typeof localStorage === "undefined") {
        console.log(LOCALSTORAGE_NOT_DEFINED);
        return;
      }
      localStorage.setItem("rpcLatencies", JSON.stringify(latencies));
    }
  }

  static setRefreshLatencies(env: string, refreshLatencies: number): void {
    if (env === "browser") {
      if (typeof localStorage === "undefined") {
        console.log(LOCALSTORAGE_NOT_DEFINED);
        return;
      }
      localStorage.setItem("refreshLatencies", JSON.stringify(refreshLatencies));
    }
  }
}
