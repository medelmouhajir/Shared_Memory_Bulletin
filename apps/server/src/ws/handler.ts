import type { ClientToServerMessage } from "@openclaw/types";
import type { ServerWebSocket } from "bun";

import { registerClient, unregisterClient } from "./broadcast";

export const websocketHandlers = {
  open(socket: ServerWebSocket<{ channels: Set<string> }>) {
    socket.data.channels.add("*");
    registerClient(socket);
  },

  message(socket: ServerWebSocket<{ channels: Set<string> }>, raw: string | Buffer) {
    let message: ClientToServerMessage;
    try {
      message = JSON.parse(String(raw)) as ClientToServerMessage;
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    if (message.type === "subscribe") {
      for (const channel of message.channels) socket.data.channels.add(channel);
      return;
    }

    if (message.type === "unsubscribe") {
      for (const channel of message.channels) socket.data.channels.delete(channel);
    }
  },

  close(socket: ServerWebSocket<{ channels: Set<string> }>) {
    unregisterClient(socket);
  },
};
