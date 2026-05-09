const STORAGE_KEY = "r10progress:aiExampleReportDismissed";

export function isAiExampleReportDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissAiExampleReport(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // private mode / unavailable — no-op
  }
}
