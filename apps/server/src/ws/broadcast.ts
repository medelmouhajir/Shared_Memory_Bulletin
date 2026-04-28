import type { ServerToClientMessage } from "@openclaw/types";
import type { ServerWebSocket } from "bun";

type Client = {
  socket: ServerWebSocket<{ channels: Set<string> }>;
  channels: Set<string>;
};

const clients = new Set<Client>();

function channelsFor(message: ServerToClientMessage): string[] {
  switch (message.type) {
    case "memory:created":
      return ["memories", `memory:${message.memory.id}`];
    case "memory:updated":
      return ["memories", `memory:${message.id}`];
    case "agent:status":
      return ["agents", `agent:${message.agent.id}`];
    case "wake_up:sent":
    case "wake_up:acked":
      return ["wakeups", `memory:${message.memory_id}`, `agent:${message.agent_id}`];
    case "zombie:detected":
      return ["agents", "zombies", `memory:${message.memory_id}`, `agent:${message.agent_id}`];
    case "console:output":
      return ["console", `agent:${message.agent_id}`];
    case "event:created":
      return ["events"];
  }
}

export function registerClient(socket: ServerWebSocket<{ channels: Set<string> }>): void {
  clients.add({ socket, channels: socket.data.channels });
}

export function unregisterClient(socket: ServerWebSocket<{ channels: Set<string> }>): void {
  for (const client of clients) {
    if (client.socket === socket) {
      clients.delete(client);
      break;
    }
  }
}

export function broadcast(message: ServerToClientMessage): void {
  const payload = JSON.stringify(message);
  const messageChannels = channelsFor(message);

  for (const client of clients) {
    if (
      client.channels.has("*") ||
      messageChannels.some((channel) => client.channels.has(channel))
    ) {
      client.socket.send(payload);
    }
  }
}
