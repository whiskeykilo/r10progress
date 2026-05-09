import { Router } from "express";
import { z } from "zod";

/**
 * GHIN data access requires USGA-approved credentials. Self-hosted installs
 * should set GHIN_API_* env vars if/when an official integration is available.
 * Until then we return a clear signal so the UI can fall back to manual handicap.
 */
const router = Router();

router.post("/lookup", async (req, res) => {
  const body = z
    .object({
      ghinNumber: z.string().min(4).max(20),
    })
    .safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const enabled =
    Boolean(process.env.GHIN_API_BASE_URL?.trim()) &&
    Boolean(process.env.GHIN_API_TOKEN?.trim());

  if (!enabled) {
    res.status(503).json({
      ok: false,
      code: "GHIN_NOT_CONFIGURED",
      message:
        "GHIN API is not configured on this server. Enter your Handicap Index manually under Settings.",
    });
    return;
  }

  // Placeholder for future approved integration against GHIN_API_BASE_URL.
  res.status(501).json({
    ok: false,
    code: "GHIN_LOOKUP_NOT_IMPLEMENTED",
    message: "GHIN token is set but the lookup adapter is not implemented yet.",
  });
});

export default router;
