/**
 * Short labels for chart axes/legends (e.g. "7 Iron" → "7i", "Driver" → "D").
 * Tooltips can still show the full club name from source data.
 */
export function abbreviateClubName(club: string): string {
  const raw = club.trim().normalize("NFKC");
  if (!raw) return "";
  const lc = raw.toLowerCase();

  if (/\blob(?:[- ]?wedges?|-wedge|wedge)\b/.test(lc) || /\blobwedge\b/.test(lc))
    return "LW";
  if (/\bsand(?:[- ]?wedges?|-wedge|wedge)\b/.test(lc) || /\bsandwedge\b/.test(lc))
    return "SW";
  if (/\bgap(?:[- ]?wedges?|-wedge|wedge)\b/.test(lc) || /\bgapwedge\b/.test(lc))
    return "GW";
  if (
    /\bpitching(?:[- ]?wedges?|-wedge|wedge)\b/.test(lc) ||
    /\bpitchingwedge\b/.test(lc)
  )
    return "PW";
  if (
    /\bapproach(?:[- ]?wedges?|-wedge|wedge)\b/.test(lc) ||
    /\bapproachwedge\b/.test(lc)
  )
    return "AW";

  if (/\bdriver\b/.test(lc) || /\btreiber\b/.test(lc)) return "D";
  if (/^d$/i.test(raw)) return "D";

  const wood = lc.match(/\b(\d{1,2})\s*w(?:ood)?\b/);
  if (wood) return `${wood[1]}w`;
  const woodRev = lc.match(/\bw(?:ood)?\s*(\d{1,2})\b/);
  if (woodRev) return `${woodRev[1]}w`;

  const hyb = lc.match(
    /\b(\d{1,2})\s*(?:hybrid|rescue|utility(?:\s*iron)?|ut)\b/,
  );
  if (hyb) return `${hyb[1]}h`;
  const hybRev = lc.match(
    /\b(?:hybrid|rescue|utility(?:\s*iron)?)\s*(\d{1,2})\b/,
  );
  if (hybRev) return `${hybRev[1]}h`;

  const iron = lc.match(
    /\b(\d{1,2})\s*(?:u\s*)?(?:iron|eisen|hierro|ijzer|ijz)\b/,
  );
  if (iron) return `${iron[1]}i`;

  if (/\bputter\b/.test(lc)) return "Pt";

  const words = raw.split(/[\s-/]+/).filter(Boolean);
  if (words.length >= 2) {
    const init = words
      .map((w) => {
        const m = w.match(/[a-z0-9]/i);
        return m ? m[0].toUpperCase() : "";
      })
      .join("");
    if (init.length >= 2 && init.length <= 4) return init;
  }
  return raw.length <= 4 ? raw : `${raw.slice(0, 3)}…`;
}
