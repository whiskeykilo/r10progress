import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db";

const router = Router();

router.get("/", async (_req, res) => {
  const db = await getDb();
  const result = await db.execute(
    "SELECT filename, results, created_at FROM sessions ORDER BY created_at DESC",
  );

  const sessions: Record<string, unknown> = {};
  for (const row of result.rows) {
    sessions[row.filename as string] = {
      results: JSON.parse(row.results as string),
      created_at: row.created_at,
    };
  }
  res.json(sessions);
});

router.post("/:filename", async (req, res) => {
  const { filename } = req.params;
  const body = z
    .object({ results: z.array(z.record(z.unknown())) })
    .safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const db = await getDb();
  await db.execute({
    sql: "INSERT OR REPLACE INTO sessions (filename, results) VALUES (?, ?)",
    args: [filename, JSON.stringify(body.data.results)],
  });
  res.json({ ok: true });
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

export default router;
