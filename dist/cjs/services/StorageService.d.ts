export declare class StorageService {
  static getLatencies(env: string): Record<string | number, number>;
  static getRefreshLatencies(env: string): number;
  static setLatencies(env: string, latencies: Record<string | number, number>): void;
  static setRefreshLatencies(env: string, refreshLatencies: number): void;
}
