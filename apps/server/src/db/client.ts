import { Database } from "bun:sqlite";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

import type { Config } from "../config";

export type Db = Database;

export function createDb(config: Pick<Config, "dbPath" | "dbWal">): Db {
  mkdirSync(dirname(config.dbPath), { recursive: true });
  const db = new Database(config.dbPath, { create: true });
  db.run("PRAGMA foreign_keys = ON");
  if (config.dbWal) {
    db.run("PRAGMA journal_mode = WAL");
  }
  return db;
}
