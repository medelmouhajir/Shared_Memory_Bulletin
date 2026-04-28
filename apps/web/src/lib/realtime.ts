export const DISCONNECTED_REFETCH_INTERVAL_MS = 5_000;

export function getRealtimeRefetchInterval(isConnected: boolean): false | number {
  return isConnected ? false : DISCONNECTED_REFETCH_INTERVAL_MS;
}
