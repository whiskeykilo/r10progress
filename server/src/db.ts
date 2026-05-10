import { Client, createClient } from "@libsql/client";
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "sqlite.db");

let _client: Client | null = null;

export async function getDb(): Promise<Client> {
  if (_client) return _client;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  _client = createClient({ url: `file:${DB_PATH}` });
  await migrate(_client);
  return _client;
}

async function migrate(db: Client) {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS sessions (
      filename TEXT PRIMARY KEY,
      results  TEXT NOT NULL,
      display_name TEXT,
      tags TEXT,
      notes TEXT,
      environment TEXT DEFAULT 'unknown',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      id   INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id         TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      shot_count INTEGER,
      timeframe  TEXT,
      filename   TEXT,
      analysis   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id   INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analyze_jobs (
      id         TEXT PRIMARY KEY,
      status     TEXT NOT NULL,
      input_hash TEXT,
      payload    TEXT NOT NULL,
      report_id  TEXT,
      error      TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Idempotent column add for content-hash dedup. SQLite has no
  // ADD COLUMN IF NOT EXISTS, so check via PRAGMA table_info first.
  const cols = await db.execute("PRAGMA table_info(reports)");
  const hasInputHash = cols.rows.some((r) => r.name === "input_hash");
  if (!hasInputHash) {
    await db.execute("ALTER TABLE reports ADD COLUMN input_hash TEXT");
  }
  const sessionCols = await db.execute("PRAGMA table_info(sessions)");
  const hasDisplayName = sessionCols.rows.some(
    (r) => r.name === "display_name",
  );
  if (!hasDisplayName) {
    await db.execute("ALTER TABLE sessions ADD COLUMN display_name TEXT");
  }
  const hasTags = sessionCols.rows.some((r) => r.name === "tags");
  if (!hasTags) {
    await db.execute("ALTER TABLE sessions ADD COLUMN tags TEXT");
  }
  const hasNotes = sessionCols.rows.some((r) => r.name === "notes");
  if (!hasNotes) {
    await db.execute("ALTER TABLE sessions ADD COLUMN notes TEXT");
  }
  const sessionColsAfter = await db.execute("PRAGMA table_info(sessions)");
  const hasEnvironment = sessionColsAfter.rows.some(
    (r) => r.name === "environment",
  );
  if (!hasEnvironment) {
    await db.execute(
      "ALTER TABLE sessions ADD COLUMN environment TEXT DEFAULT 'unknown'",
    );
  }
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_reports_input_hash ON reports(input_hash)",
  );
}
