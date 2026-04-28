import type { ServerToClientMessage } from "@openclaw/types";

type Handler = (message: ServerToClientMessage) => void;

const handlers = new Set<Handler>();
let socket: WebSocket | null = null;

export function connectWebSocket(): WebSocket {
  if (socket && socket.readyState <= WebSocket.OPEN) return socket;

  const protocol = location.protocol === "https:" ? "wss" : "ws";
  socket = new WebSocket(`${protocol}://${location.host}/ws`);
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data as string) as ServerToClientMessage;
    for (const handler of handlers) handler(message);
  });
  socket.addEventListener("close", () => {
    setTimeout(connectWebSocket, 1000);
  });
  return socket;
}

export function subscribe(handler: Handler): () => void {
  handlers.add(handler);
  connectWebSocket();
  return () => handlers.delete(handler);
}
