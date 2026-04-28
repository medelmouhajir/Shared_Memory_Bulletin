import { useCallback, useEffect } from "react";
import type { ServerToClientMessage } from "@openclaw/types";

import { connectWebSocket, subscribe } from "../lib/ws";

export function useWebSocket() {
  useEffect(() => {
    connectWebSocket();
  }, []);

  return {
    subscribe: useCallback((handler: (message: ServerToClientMessage) => void) => subscribe(handler), []),
  };
}
