import express from "express";
import path from "path";
import analyzeRouter from "./routes/analyze";
import reportsRouter from "./routes/reports";
import sessionsRouter from "./routes/sessions";
import settingsRouter from "./routes/settings";
import goalsRouter from "./routes/goals";
import ghinRouter from "./routes/ghin";

const app = express();
const PORT = parseInt(process.env.PORT ?? "8080", 10);

// The built SPA lives one directory up from server/dist at runtime
const STATIC_DIR = process.env.STATIC_DIR ?? path.join(__dirname, "../../dist");
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");

app.use(express.json({ limit: "50mb" }));

app.use("/api/sessions", sessionsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/goals", goalsRouter);
app.use("/api/ghin", ghinRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/analyze", analyzeRouter);

// Serve the built SPA and fall back to index.html for client-side routing
app.use(express.static(STATIC_DIR));
app.get("*", (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, "index.html"));
});

const server = app.listen(PORT, () => {
  console.log(`r10progress server running on port ${PORT}`);
  console.log(`[startup] STATIC_DIR=${STATIC_DIR}`);
  console.log(`[startup] DATA_DIR=${DATA_DIR}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\nr10progress: port ${PORT} is already in use. Stop the other server or run with PORT=<free-port>.\n`,
    );
  } else {
    console.error("[r10progress] HTTP server error:", err);
  }
});
