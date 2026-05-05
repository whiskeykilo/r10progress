import { Router } from "express";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { getDb } from "../db";

const router = Router();

const BodySchema = z.object({
  shots: z.array(z.record(z.unknown())),
  timeframe: z.string(),
  filename: z.string(),
});

router.post("/", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "OPENAI_API_KEY not configured" });
    return;
  }

  const body = BodySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const { shots, timeframe, filename } = body.data;

  const shotsForPrompt = shots.slice(0, 200).map((s) => ({
    clubName: s["Club Name"] ?? s["Schlägername"] ?? s["Nombre del palo"],
    clubType: s["Club Type"] ?? s["Schlägerart"] ?? s["Tipo de palo"],
    ballSpeed: s["Ball Speed"] ?? s["Ballgeschwindigkeit"] ?? s["Velocidad de bola"],
    clubSpeed: s["Club Speed"] ?? s["Schl.gsch."] ?? s["Velocidad del palo"],
    launchAngle: s["Launch Angle"] ?? s["Abflugwinkel"] ?? s["Ángulo de lanzamiento"],
    launchDirection: s["Launch Direction"] ?? s["Abflugrichtung"] ?? s["Dirección de lanzamiento"],
    carryDistance: s["Carry Distance"] ?? s["Carry-Distanz"] ?? s["Dist.​vuelo"],
    totalDistance: s["Total Distance"] ?? s["Gesamtstrecke"] ?? s["Distan​cia total"],
    spinRate: s["Spin Rate"] ?? s["Drehrate"] ?? s["Tasa de giro"],
    backspin: s["Backspin"],
    sidespin: s["Sidespin"],
    clubFace: s["Club Face"] ?? s["Schlagfläche"] ?? s["Cara del palo"],
    clubPath: s["Club Path"] ?? s["Schwungbahn"] ?? s["Línea del palo"],
    faceToPath: s["Face to Path"] ?? s["Schlagflächenstellung"] ?? s["Cara a línea"],
    attackAngle: s["Attack Angle"] ?? s["Anstellwinkel"] ?? s["Ángulo de ataque"],
    smashFactor: s["Smash Factor"] ?? s["Smash-Faktor"] ?? s["Calidad del impacto"],
    spinAxis: s["Spin Axis"] ?? s["Drehachse"] ?? s["Eje de giro"],
    apexHeight: s["Apex Height"] ?? s["Höhe des Scheitelpunkts"] ?? s["Altura máxima"],
    carryDeviation: s["Carry Deviation Distance"] ?? s["Carry-Abweichungsdistanz"] ?? s["Distancia de desviación de vuelo"],
    totalDeviation: s["Total Deviation Distance"] ?? s["Gesamtabweichungsdistanz"] ?? s["Distancia de desviación total"],
    date: s["Date"] ?? s["Datum"] ?? s["Fecha"],
  }));

  const prompt = `You are an expert golf coach and data analyst. Analyze the following ${shotsForPrompt.length} golf shots from a Garmin R10 launch monitor and provide detailed coaching insights.

Timeframe: ${timeframe}
Session files: ${filename}

Shot data (JSON):
${JSON.stringify(shotsForPrompt, null, 2)}

Respond with a JSON object matching this exact TypeScript interface. No markdown, no explanation — raw JSON only:

{
  "technicalAnalysis": {
    "impactConditions": {
      "faceControl":    { "score": number, "consistency": number, "pattern": string, "recommendation": string },
      "pathControl":    { "score": number, "consistency": number, "pattern": string, "recommendation": string },
      "strikeQuality":  { "score": number, "consistency": number, "pattern": string, "recommendation": string }
    },
    "ballFlight": {
      "launchConditions":   { "score": number, "consistency": number, "pattern": string, "recommendation": string },
      "spinControl":        { "score": number, "consistency": number, "pattern": string, "recommendation": string },
      "dispersionControl":  { "score": number, "consistency": number, "pattern": string, "recommendation": string }
    }
  },
  "performanceMetrics": {
    "consistencyScore": number,
    "accuracyScore":    number,
    "efficiencyScore":  number,
    "overallScore":     number
  },
  "practiceRecommendations": {
    "highPriorityFocus": string,
    "drills": [{ "name": string, "purpose": string, "steps": string[], "successMetrics": string[], "difficulty": "beginner"|"intermediate"|"advanced" }]
  },
  "statistics": {
    "consistencyMetrics": {
      "ballSpeedConsistency":   number,
      "launchAngleConsistency": number,
      "spinRateConsistency":    number,
      "dispersionPattern": {
        "averageOffline": number,
        "dispersionEllipse": { "width": number, "length": number }
      }
    },
    "commonIssues": string[],
    "trends": {
      "distanceTrend":    "improving"|"declining"|"stable",
      "accuracyTrend":    "improving"|"declining"|"stable",
      "consistencyTrend": "improving"|"declining"|"stable"
    }
  }
}

All score/consistency values are 0-100.`;

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty response from OpenAI");

    const analysis = JSON.parse(raw);
    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const db = await getDb();
    await db.execute({
      sql: "INSERT INTO reports (id, created_at, shot_count, timeframe, filename, analysis) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, now, shots.length, timeframe, filename, JSON.stringify(analysis)],
    });

    res.json({
      id,
      createdAt: new Date(now * 1000).toISOString(),
      shotCount: shots.length,
      timeframe,
      filename,
      analysis,
    });
  } catch (err) {
    console.error("OpenAI error:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
