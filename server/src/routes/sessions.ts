import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db";
import { generateSessionDisplayName } from "../services/sessionNaming";

const SessionEnvSchema = z.enum(["indoor", "outdoor", "unknown"]);

const router = Router();

router.get("/", async (_req, res) => {
  const db = await getDb();
  const result = await db.execute(
    "SELECT filename, display_name, tags, notes, results, created_at, environment FROM sessions ORDER BY created_at DESC",
  );

  const sessions: Record<string, unknown> = {};
  for (const row of result.rows) {
    sessions[row.filename as string] = {
      display_name: (row.display_name as string | null) ?? undefined,
      tags: (() => {
        const value = row.tags as string | null;
        if (!value) return [];
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })(),
      notes: (row.notes as string | null) ?? "",
      results: JSON.parse(row.results as string),
      created_at: row.created_at,
      environment: (row.environment as string | null) ?? "unknown",
    };
  }
  res.json(sessions);
});

router.post("/:filename", async (req, res) => {
  const { filename } = req.params;
  const body = z
    .object({
      results: z.array(z.record(z.unknown())),
      environment: SessionEnvSchema.optional(),
    })
    .safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const db = await getDb();
  const displayName = await generateSessionDisplayName(
    body.data.results,
    filename,
  );
  const environment = body.data.environment ?? "unknown";
  await db.execute({
    sql: "INSERT OR REPLACE INTO sessions (filename, display_name, tags, notes, results, environment) VALUES (?, ?, ?, ?, ?, ?)",
    args: [
      filename,
      displayName,
      JSON.stringify([]),
      "",
      JSON.stringify(body.data.results),
      environment,
    ],
  });
  res.json({ ok: true, display_name: displayName, environment });
});

router.post("/:filename/rename", async (req, res) => {
  const { filename } = req.params;
  const db = await getDb();
  const existing = await db.execute({
    sql: "SELECT results FROM sessions WHERE filename = ?",
    args: [filename],
  });
  const row = existing.rows[0];
  if (!row) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const results = JSON.parse(row.results as string) as Record<
    string,
    unknown
  >[];
  const displayName = await generateSessionDisplayName(results, filename);
  await db.execute({
    sql: "UPDATE sessions SET display_name = ? WHERE filename = ?",
    args: [displayName, filename],
  });
  res.json({ ok: true, display_name: displayName });
});

router.delete("/:filename", async (req, res) => {
  const { filename } = req.params;
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM sessions WHERE filename = ?",
    args: [filename],
  });
  res.json({ ok: true });
});

// PATCH /sessions/:filename — body: { results: GolfSwingData[] } (full replacement after row deletion)
router.patch("/:filename", async (req, res) => {
  const { filename } = req.params;
  const body = z
    .object({ results: z.array(z.record(z.unknown())) })
    .safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const db = await getDb();
  const result = await db.execute({
    sql: "UPDATE sessions SET results = ? WHERE filename = ?",
    args: [JSON.stringify(body.data.results), filename],
  });
  if (result.rowsAffected === 0) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json({ ok: true });
});

router.patch("/:filename/meta", async (req, res) => {
  const { filename } = req.params;
  const body = z
    .object({
      tags: z.array(z.string().trim()).optional(),
      notes: z.string().optional(),
      environment: SessionEnvSchema.optional(),
    })
    .safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const tags = body.data.tags?.map((tag) => tag.trim()).filter(Boolean);
  const notes = body.data.notes?.trim();
  const env = body.data.environment;

  const db = await getDb();
  const existing = await db.execute({
    sql: "SELECT tags, notes, environment FROM sessions WHERE filename = ?",
    args: [filename],
  });
  const prev = existing.rows[0];
  if (!prev) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const nextTags =
    tags ??
    (() => {
      const v = prev.tags as string | null;
      if (!v) return [];
      try {
        const p = JSON.parse(v);
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    })();
  const nextNotes = notes ?? (prev.notes as string | null) ?? "";
  const nextEnv = env ?? (prev.environment as string | null) ?? "unknown";

  const result = await db.execute({
    sql: "UPDATE sessions SET tags = ?, notes = ?, environment = ? WHERE filename = ?",
    args: [JSON.stringify(nextTags), nextNotes, nextEnv, filename],
  });

  if (result.rowsAffected === 0) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json({
    ok: true,
    tags: nextTags,
    notes: nextNotes,
    environment: nextEnv,
  });
});

export default router;
