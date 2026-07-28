/* ========================================
   Betting Storage — Ver6.0
   お気に入り / 履歴 / CSV / JSON
   ======================================== */

const HISTORY_KEY = "papapa_iq_betting_history_v60";
const FAVORITE_KEY = "papapa_iq_betting_favorites_v60";

export function saveBettingHistory(entry) {
  const list = loadBettingHistory();
  list.unshift({
    ...entry,
    id: entry.id || `bt_${Date.now()}`,
    savedAt: new Date().toISOString(),
  });
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 40)));
  } catch {
    /* ignore */
  }
  return list[0];
}

export function loadBettingHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBettingFavorite(entry) {
  const list = loadBettingFavorites();
  list.unshift({
    ...entry,
    id: entry.id || `fav_${Date.now()}`,
    savedAt: new Date().toISOString(),
  });
  try {
    localStorage.setItem(FAVORITE_KEY, JSON.stringify(list.slice(0, 30)));
  } catch {
    /* ignore */
  }
  return list[0];
}

export function loadBettingFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function ticketsToCsv(tickets = []) {
  const header = [
    "type",
    "formation",
    "selection",
    "points",
    "stake",
    "expectedValue",
    "confidence",
    "riskLevel",
    "reasons",
  ];
  const lines = [header.join(",")];
  for (const t of tickets) {
    lines.push(
      [
        t.type,
        t.formation,
        `"${String(t.selection || "").replace(/"/g, '""')}"`,
        t.points,
        t.stake || "",
        t.expectedValue,
        t.confidence,
        t.riskLevel,
        `"${(t.explain?.reasons || []).join("|").replace(/"/g, '""')}"`,
      ].join(",")
    );
  }
  return lines.join("\n");
}

export function ticketsToJson(payload) {
  return JSON.stringify(payload, null, 2);
}

export function downloadText(filename, text, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}
