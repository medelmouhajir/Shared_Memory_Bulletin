import type { Config } from "./config";
import type { Db } from "./db/client";
import type { EventWriter } from "./lib/events";

export type AppBindings = {
  db: Db;
  config: Config;
  events: EventWriter;
};

export type AppEnv = {
  Variables: AppBindings;
};
