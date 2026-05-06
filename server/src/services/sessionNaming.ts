import OpenAI from "openai";

const MODEL = "gpt-5.4-nano";
const MAX_COMPLETION_TOKENS = 64;

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
  const dateCounts = new Map<string, number>();

  for (const shot of results) {
    const club = getStringField(shot, ["clubType", "club type", "club"]);
    if (club) {
      clubs.set(club, (clubs.get(club) ?? 0) + 1);
    }

    const parsedDate = parseShotDate(
      getStringField(shot, ["Date", "Datum", "Fecha"]),
    );
    if (parsedDate) {
      dateCounts.set(parsedDate, (dateCounts.get(parsedDate) ?? 0) + 1);
    }
  }

  const clubsByCount = [...clubs.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([club, count]) => `${club} (${count})`)
    .join(", ");

  const clubCount = clubs.size;
  const sessionDate =
    [...dateCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";

  return [
    `session_date=${sessionDate}`,
    `total_shots=${results.length}`,
    `unique_clubs=${clubCount}`,
    `clubs_hit=${clubsByCount || "unknown"}`,
  ].join("; ");
}

function parseShotDate(value: string | undefined): string | null {
  if (!value) return null;

  const normalized = value.trim();
  if (!normalized) return null;

  const yyyyMmDd = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (yyyyMmDd) {
    return formatMonthDay(
      Number(yyyyMmDd[1]),
      Number(yyyyMmDd[2]),
      Number(yyyyMmDd[3]),
    );
  }

  const ddMmYyyy = normalized.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (ddMmYyyy) {
    const first = Number(ddMmYyyy[1]);
    const second = Number(ddMmYyyy[2]);
    const year = Number(ddMmYyyy[3]);
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;
    return formatMonthDay(year, month, day);
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatMonthDay(year: number, month: number, day: number): string | null {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const isoDate = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(isoDate.getTime())) return null;
  return isoDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
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
          content: `You are naming a golf practice session based on the shots/clubs that were hit.
Generate a short, natural session name (3-6 words) the way a golfer would
actually label it in their notes - not corporate or AI-flavored.

Use these patterns:
- "Wedge Work – Mar 15" (only wedges hit)
- "Driver + Woods – Apr 2" (only long clubs)
- "7i Session – Apr 2" (single club)
- "Full Bag – Mar 15" (5+ clubs spanning wedges through driver)
- "Iron Session – Apr 2" (mostly irons)
- "Short Game Day – Apr 2" (wedges + maybe a few short irons)
- "Quick Range – Apr 2" (under 20 shots, mixed)
- "Bag Gapping – Mar 15" (full spread, looks like distance testing)
- "Range Session – Mar 15" (fallback)

Rules:
- Always append a date ("Mar 15")
- Never use words like: Performance, Analysis, Tracking, Data, Metrics, Session Report.
- Title case for words; club names stay in their natural form (7i, Driver, PW).
- No emojis, no quotes, no punctuation other than the en dash before the date.
- Output ONLY the name, nothing else.

Shot data summary:
{shot_summary}`,
        },
        {
          role: "user",
          content: `shot_summary: ${summary}`,
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
