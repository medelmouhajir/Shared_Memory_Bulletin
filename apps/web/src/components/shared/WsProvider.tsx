import type { PropsWithChildren } from "react";

import { useWebSocket } from "../../hooks/useWebSocket";

export function WsProvider({ children }: PropsWithChildren) {
  useWebSocket();
  return children;
}
