import type { ServerToClientMessage } from "@openclaw/types";

type Handler = (message: ServerToClientMessage) => void;
type ConnectionStatus = "connecting" | "connected" | "disconnected";
type StatusHandler = (status: ConnectionStatus) => void;

const handlers = new Set<Handler>();
const statusHandlers = new Set<StatusHandler>();
let socket: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const BASE_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 15_000;
const JITTER_MS = 250;

function resolveWebSocketUrl(): string {
  const configuredApiBase = import.meta.env.VITE_API_BASE as string | undefined;
  if (configuredApiBase) {
    try {
      const absoluteApiUrl = new URL(configuredApiBase, location.origin);
      const wsProtocol = absoluteApiUrl.protocol === "https:" ? "wss:" : "ws:";
      return `${wsProtocol}//${absoluteApiUrl.host}/ws`;
    } catch {
      // Fall back to current host when API base cannot be parsed.
    }
  }

  const protocol = location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${location.host}/ws`;
}

function notifyStatus(status: ConnectionStatus): void {
  for (const handler of statusHandlers) handler(status);
}

export function nextReconnectDelay(attempt: number): number {
  const exponential = Math.min(MAX_RECONNECT_MS, BASE_RECONNECT_MS * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * JITTER_MS);
  return exponential + jitter;
}

function scheduleReconnect(): void {
  if (reconnectTimer || handlers.size === 0) return;
  reconnectAttempts += 1;
  const delay = nextReconnectDelay(reconnectAttempts);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectWebSocket();
  }, delay);
}

export function connectWebSocket(): WebSocket {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return socket;

  notifyStatus("connecting");
  socket = new WebSocket(resolveWebSocketUrl());
  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data as string) as ServerToClientMessage;
      for (const handler of handlers) handler(message);
    } catch {
      // Ignore malformed WS payloads from server.
    }
  });
  socket.addEventListener("open", () => {
    reconnectAttempts = 0;
    notifyStatus("connected");
  });
  socket.addEventListener("error", () => {
    notifyStatus("disconnected");
  });
  socket.addEventListener("close", () => {
    notifyStatus("disconnected");
    socket = null;
    scheduleReconnect();
  });
  return socket;
}

export function subscribe(handler: Handler): () => void {
  handlers.add(handler);
  connectWebSocket();
  return () => {
    handlers.delete(handler);
    if (handlers.size === 0 && socket?.readyState === WebSocket.OPEN) socket.close(1000, "No subscribers");
  };
}

export function subscribeConnectionStatus(handler: StatusHandler): () => void {
  statusHandlers.add(handler);
  return () => {
    statusHandlers.delete(handler);
  };
}
