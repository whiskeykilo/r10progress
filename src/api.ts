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
      throw new Error(
        `GET ${path} failed: ${res.status}${devApiTroubleshootingHint()}`,
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
      throw new Error(
        `POST ${path} failed: ${res.status}${devApiTroubleshootingHint()}`,
      );
    }
    return res.json();
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("POST ")) throw e;
    throw wrapFetchError("POST", path, e);
  }
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
