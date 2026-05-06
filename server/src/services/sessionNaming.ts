import OpenAI from "openai";

const MODEL = "gpt-5.4-nano";
const MAX_COMPLETION_TOKENS = 32;

type ShotRecord = Record<string, unknown>;

function getStringField(
  shot: ShotRecord,
  candidates: string[],
): string | undefined {
  const lowerMap = new Map<string, unknown>();
  for (const [key, value] of Object.entries(shot)) {
    lowerMap.set(key.toLowerCase(), value);
  }
  for (const candidate of candidates) {
    const value = lowerMap.get(candidate.toLowerCase());
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function buildSessionSummary(results: ShotRecord[]): string {
  const clubs = new Map<string, number>();
  let minDistance: number | null = null;
  let maxDistance: number | null = null;

  for (const shot of results) {
    const club = getStringField(shot, ["clubType", "club type", "club"]);
    if (club) {
      clubs.set(club, (clubs.get(club) ?? 0) + 1);
    }

    const distanceField = shot.CarryDistance ?? shot["carry distance"];
    if (typeof distanceField === "number" && Number.isFinite(distanceField)) {
      minDistance =
        minDistance === null
          ? distanceField
          : Math.min(minDistance, distanceField);
      maxDistance =
        maxDistance === null
          ? distanceField
          : Math.max(maxDistance, distanceField);
    }
  }

  const topClubs = [...clubs.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([club, count]) => `${club} (${count})`)
    .join(", ");

  const distanceSummary =
    minDistance !== null && maxDistance !== null
      ? `${Math.round(minDistance)}-${Math.round(maxDistance)}`
      : "unknown";

  return `shots=${results.length}; top_clubs=${topClubs || "unknown"}; carry_range=${distanceSummary}`;
}

function sanitizeName(name: string, fallback: string): string {
  const clean = name.replace(/["'`]/g, "").trim();
  if (!clean) return fallback;
  if (clean.length <= 48) return clean;
  return clean.slice(0, 48).trim();
}

export async function generateSessionDisplayName(
  results: ShotRecord[],
  fallbackName: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || results.length === 0) return fallbackName;

  const summary = buildSessionSummary(results);
  const client = new OpenAI({ apiKey });

  try {
    const completion = await client.chat.completions.create({
      model: MODEL as unknown as Parameters<
        typeof client.chat.completions.create
      >[0]["model"],
      messages: [
        {
          role: "system",
          content:
            "Create concise golf session titles. Return only the title text. Max 6 words.",
        },
        {
          role: "user",
          content: `Generate a short session title from this summary: ${summary}`,
        },
      ],
      max_completion_tokens: MAX_COMPLETION_TOKENS,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    return sanitizeName(raw, fallbackName);
  } catch (error) {
    console.error("Session naming error:", error);
    return fallbackName;
  }
}
