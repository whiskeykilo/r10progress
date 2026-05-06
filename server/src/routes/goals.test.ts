import express, { Express } from "express";
import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";

let app: Express;
let tempDataDir: string;

describe("/api/goals", () => {
  beforeAll(async () => {
    tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "r10progress-goals-"));
    process.env.DATA_DIR = tempDataDir;

    // Ensure db module reads DATA_DIR from this test-specific temp folder.
    vi.resetModules();
    const { default: goalsRouter } = await import("./goals");

    app = express();
    app.use(express.json());
    app.use("/api/goals", goalsRouter);
  });

  afterAll(() => {
    fs.rmSync(tempDataDir, { recursive: true, force: true });
  });

  it("returns an empty list when no goals are stored", async () => {
    const res = await request(app).get("/api/goals");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("persists valid goals and returns them", async () => {
    const payload = [
      {
        id: "g1",
        title: "Driving distance",
        target: 200,
        metric: "Carry Distance",
        direction: "increase",
      },
    ];

    const putRes = await request(app).put("/api/goals").send(payload);
    expect(putRes.status).toBe(200);
    expect(putRes.body).toEqual({ ok: true });

    const getRes = await request(app).get("/api/goals");
    expect(getRes.status).toBe(200);
    expect(getRes.body).toEqual(payload);
  });

  it("rejects invalid payloads", async () => {
    const res = await request(app).put("/api/goals").send({
      id: "not-an-array",
    });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid body" });
  });
});
