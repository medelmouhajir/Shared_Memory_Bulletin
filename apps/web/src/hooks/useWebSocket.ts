import { useCallback, useEffect, useState } from "react";
import type { ServerToClientMessage } from "@openclaw/types";

import { connectWebSocket, subscribe, subscribeConnectionStatus } from "../lib/ws";

export function useWebSocket() {
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  useEffect(() => {
    connectWebSocket();
    return subscribeConnectionStatus(setConnectionStatus);
  }, []);

  return {
    subscribe: useCallback((handler: (message: ServerToClientMessage) => void) => subscribe(handler), []),
    connectionStatus,
    isConnected: connectionStatus === "connected",
  };
}
