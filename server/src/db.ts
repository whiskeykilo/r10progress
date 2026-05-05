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
  `);
}
