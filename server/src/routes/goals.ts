import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db";

const router = Router();

const goalSchema = z.object({
  id: z.string(),
  title: z.string(),
  target: z.number(),
  club: z.string().optional(),
  metric: z.string(),
  direction: z.enum(["increase", "decrease"]).optional(),
});

const goalsSchema = z.array(goalSchema);

router.get("/", async (_req, res) => {
  const db = await getDb();
  const result = await db.execute("SELECT data FROM goals WHERE id = 1");
  const row = result.rows[0];

  if (!row) {
    res.json([]);
    return;
  }

  try {
    const parsed = goalsSchema.parse(JSON.parse(row.data as string));
    res.json(parsed);
  } catch {
    res.json([]);
  }
});

router.put("/", async (req, res) => {
  const body = goalsSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const db = await getDb();
  await db.execute({
    sql: "INSERT OR REPLACE INTO goals (id, data) VALUES (1, ?)",
    args: [JSON.stringify(body.data)],
  });
  res.json({ ok: true });
});

export default router;
