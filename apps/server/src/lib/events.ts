import type { EventType, OpenClawEvent, ServerToClientMessage } from "@openclaw/types";

import type { Db } from "../db/client";
import { broadcast } from "../ws/broadcast";

export type EventWriter = {
  logEvent(
    input: {
      memory_id?: string | null;
      agent_id?: string | null;
      event_type: EventType;
      payload?: unknown;
    },
    options?: { silent?: boolean },
  ): OpenClawEvent;
};

export function createEventWriter(db: Db): EventWriter {
  const insert = db.query(`
    INSERT INTO events (memory_id, agent_id, event_type, payload, ts)
    VALUES (?, ?, ?, ?, ?)
    RETURNING *
  `);

  return {
    logEvent(input, options) {
      const event = insert.get(
        input.memory_id ?? null,
        input.agent_id ?? null,
        input.event_type,
        input.payload === undefined ? null : JSON.stringify(input.payload),
        Date.now(),
      ) as OpenClawEvent;

      if (!options?.silent) {
        const message: ServerToClientMessage = { type: "event:created", event };
        broadcast(message);
      }

      return event;
    },
  };
}
