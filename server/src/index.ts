import express from "express";
import path from "path";
import analyzeRouter from "./routes/analyze";
import reportsRouter from "./routes/reports";
import sessionsRouter from "./routes/sessions";
import settingsRouter from "./routes/settings";

const app = express();
const PORT = parseInt(process.env.PORT ?? "8080", 10);

// The built SPA lives one directory up from server/dist at runtime
const STATIC_DIR = process.env.STATIC_DIR ?? path.join(__dirname, "../../dist");

app.use(express.json({ limit: "50mb" }));

app.use("/api/sessions", sessionsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/analyze", analyzeRouter);

// Serve the built SPA and fall back to index.html for client-side routing
app.use(express.static(STATIC_DIR));
app.get("*", (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`r10progress server running on port ${PORT}`);
});
