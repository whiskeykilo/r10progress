// Thin fetch wrapper replacing Firebase SDK calls

function devApiTroubleshootingHint(): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    return (
      " Development: use a single `pnpm dev` and the URL it prints for Vite. " +
      "If the API failed to start with EADDRINUSE, stop the other process on port 8080 or set PORT for the server."
    );
  }
  return "";
}

async function appendResponseErrorDetail(res: Response): Promise<string> {
  try {
    const j = (await res.clone().json()) as { error?: unknown };
    if (typeof j?.error === "string" && j.error.length > 0) {
      return `: ${j.error}`;
    }
  } catch {
    /* ignore non-JSON bodies */
  }
  return "";
}

function wrapFetchError(method: string, path: string, error: unknown): Error {
  const base = error instanceof Error ? error.message : String(error);
  if (base === "Failed to fetch" || error instanceof TypeError) {
    return new Error(
      `${method} ${path} failed: network error (is the API running?).${devApiTroubleshootingHint()}`,
    );
  }
  return error instanceof Error ? error : new Error(base);
}

/** Optional warm-up: returns true if GET /api/sessions succeeds. */
export async function apiSessionsReachable(): Promise<boolean> {
  try {
    const res = await fetch("/api/sessions");
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  try {
    const res = await fetch(path);
    if (!res.ok) {
      const detail = await appendResponseErrorDetail(res);
      throw new Error(
        `GET ${path} failed: ${res.status}${detail}${devApiTroubleshootingHint()}`,
      );
    }
    return res.json();
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("GET ")) throw e;
    throw wrapFetchError("GET", path, e);
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await appendResponseErrorDetail(res);
      throw new Error(
        `POST ${path} failed: ${res.status}${detail}${devApiTroubleshootingHint()}`,
      );
    }
    return res.json();
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("POST ")) throw e;
    throw wrapFetchError("POST", path, e);
  }
}

/** Response shape from GET `/api/analyze/jobs/:jobId`. */
export type AnalyzeJobPollResponse =
  | { status: "queued" | "running" }
  | {
    status: "completed";
    report: {
      id: string;
      createdAt: string;
      shotCount: number;
      timeframe: string;
      filename: string;
      analysis: unknown;
      cached: boolean;
    };
  }
  | { status: "failed"; error: string };

/**
 * POST `/api/analyze`: 200 = cached/finished immediately, 202 = background job started.
 */
export async function apiPostAnalyze(body: unknown): Promise<
  | {
    outcome: "complete";
    report: {
      id: string;
      createdAt: string;
      shotCount: number;
      timeframe: string;
      filename: string;
      analysis: unknown;
      cached?: boolean;
    };
  }
  | { outcome: "job"; jobId: string }
> {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await appendResponseErrorDetail(res);
      throw new Error(
        `POST /api/analyze failed: ${res.status}${detail}${devApiTroubleshootingHint()}`,
      );
    }
    const json = (await res.json()) as Record<string, unknown>;
    if (res.status === 202) {
      const jobId = json.jobId;
      if (typeof jobId !== "string" || jobId.length === 0) {
        throw new Error("POST /api/analyze returned 202 without jobId");
      }
      return { outcome: "job", jobId };
    }
    return {
      outcome: "complete",
      report: json as {
        id: string;
        createdAt: string;
        shotCount: number;
        timeframe: string;
        filename: string;
        analysis: unknown;
        cached?: boolean;
      },
    };
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("POST /api/analyze"))
      throw e;
    throw wrapFetchError("POST", "/api/analyze", e);
  }
}

export async function pollAnalyzeJob(
  jobId: string,
  options?: { maxWaitMs?: number },
): Promise<Extract<AnalyzeJobPollResponse, { status: "completed" }>["report"]> {
  const maxWaitMs = options?.maxWaitMs ?? 45 * 60 * 1000;
  const started = Date.now();
  let intervalMs = 2000;

  while (Date.now() - started < maxWaitMs) {
    const status = await apiGet<AnalyzeJobPollResponse>(
      `/api/analyze/jobs/${encodeURIComponent(jobId)}`,
    );
    if (status.status === "completed" && "report" in status) {
      return status.report;
    }
    if (status.status === "failed") {
      throw new Error(status.error || "Analysis failed");
    }
    await new Promise((r) => setTimeout(r, intervalMs));
    intervalMs = Math.min(intervalMs + 500, 10_000);
  }

  throw new Error(
    "Analysis is taking longer than expected. You can leave this page and check Previous reports in a few minutes.",
  );
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(path, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
}
