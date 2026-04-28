import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

import type { Db } from "../db/client";

export function backupDatabase(db: Db, outputPath: string): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  db.run(`VACUUM INTO ?`, [outputPath]);
}

export function startNightlyBackup(db: Db, outputDir = "./data/backups"): Timer {
  return setInterval(() => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    backupDatabase(db, `${outputDir}/openclaw-${stamp}.db`);
  }, 24 * 60 * 60 * 1000);
}
