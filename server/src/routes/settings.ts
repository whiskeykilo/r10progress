import { Router } from "express";
import { getDb } from "../db";

const router = Router();

const DEFAULT_SETTINGS = {
  useIQR: false,
  useAboveAverageShots: false,
  unit: "meters",
};

router.get("/", async (_req, res) => {
  const db = await getDb();
  const result = await db.execute("SELECT data FROM settings WHERE id = 1");
  const row = result.rows[0];
  res.json(row ? JSON.parse(row.data as string) : DEFAULT_SETTINGS);
});

router.put("/", async (req, res) => {
  const db = await getDb();
  await db.execute({
    sql: "INSERT OR REPLACE INTO settings (id, data) VALUES (1, ?)",
    args: [JSON.stringify(req.body)],
  });
  res.json({ ok: true });
});

export default router;
