import { Router } from "express";
import { getDb } from "../db";

const router = Router();

router.get("/", async (_req, res) => {
  const db = await getDb();
  const result = await db.execute(
    "SELECT id, created_at, shot_count, timeframe, filename, analysis FROM reports ORDER BY created_at DESC",
  );

  const reports = result.rows.map((r) => ({
    id: r.id,
    createdAt: new Date((r.created_at as number) * 1000).toISOString(),
    shotCount: r.shot_count,
    timeframe: r.timeframe,
    filename: r.filename,
    analysis: JSON.parse(r.analysis as string),
  }));
  res.json(reports);
});

router.get("/:id", async (req, res) => {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT id, created_at, shot_count, timeframe, filename, analysis FROM reports WHERE id = ?",
    args: [req.params.id],
  });
  const row = result.rows[0];
  if (!row) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  res.json({
    id: row.id,
    createdAt: new Date((row.created_at as number) * 1000).toISOString(),
    shotCount: row.shot_count,
    timeframe: row.timeframe,
    filename: row.filename,
    analysis: JSON.parse(row.analysis as string),
  });
});

router.delete("/:id", async (req, res) => {
  const db = await getDb();
  const result = await db.execute({
    sql: "DELETE FROM reports WHERE id = ?",
    args: [req.params.id],
  });

  if (result.rowsAffected === 0) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  res.status(204).send();
});

export default router;
