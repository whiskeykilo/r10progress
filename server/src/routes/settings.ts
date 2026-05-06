import { Router } from "express";
import { getDb } from "../db";

const router = Router();

const DEFAULT_SETTINGS = {
  useIQR: false,
  useAboveAverageShots: false,
  useShotQualityFilter: true,
  shotQualitySdMode: "asymmetric",
  unit: "yards",
  applyRangeBallCompensation: false,
  rangeBallCompensation: {
    wedges: 1.05,
    shortIrons: 1.06,
    midLongIrons: 1.07,
    hybridsWoodsDriver: 1.08,
  },
};

router.get("/", async (_req, res) => {
  const db = await getDb();
  const result = await db.execute("SELECT data FROM settings WHERE id = 1");
  const row = result.rows[0];
  if (!row) {
    res.json(DEFAULT_SETTINGS);
    return;
  }
  const stored = JSON.parse(row.data as string);
  res.json({
    ...DEFAULT_SETTINGS,
    ...stored,
    rangeBallCompensation: {
      ...DEFAULT_SETTINGS.rangeBallCompensation,
      ...stored.rangeBallCompensation,
    },
  });
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
