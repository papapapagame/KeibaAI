/* ========================================
   Odds History Manager — Ver7.8
   ======================================== */

const HISTORY_KEY = "papapa_iq_odds_history_v78";
const MAX_HISTORY = 120;

export function recordOddsChange(type, detail = {}, note = "") {
  const entry = {
    id: `oh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    type,
    detail,
    note: note || "",
  };
  const list = loadOddsHistory();
  list.unshift(entry);
  if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
  saveOddsHistory(list);
  return entry;
}

export function loadOddsHistory() {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOddsHistory(list) {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function diffOdds(prev = [], next = []) {
  const prevMap = new Map((prev || []).map((o) => [String(o.number), o]));
  const changes = [];

  for (const n of next || []) {
    const key = String(n.number);
    const p = prevMap.get(key);
    if (!p) {
      changes.push({
        type: "odds_added",
        number: n.number,
        winOdds: n.winOdds,
        popularity: n.popularity,
      });
      continue;
    }
    if (Number(p.winOdds) !== Number(n.winOdds)) {
      changes.push({
        type: "odds_updated",
        number: n.number,
        from: p.winOdds,
        to: n.winOdds,
        horse: n.horse,
      });
    }
    if (Number(p.popularity) !== Number(n.popularity)) {
      changes.push({
        type: "popularity_changed",
        number: n.number,
        from: p.popularity,
        to: n.popularity,
        horse: n.horse,
      });
    }
    if (
      p.marketIndex != null &&
      n.marketIndex != null &&
      Number(p.marketIndex) !== Number(n.marketIndex)
    ) {
      changes.push({
        type: "market_index_updated",
        number: n.number,
        from: p.marketIndex,
        to: n.marketIndex,
        horse: n.horse,
      });
    }
  }
  return changes;
}

export function summarizeOddsTrend(item) {
  const hist = item?.history || [];
  if (hist.length < 2) return "stable";
  const first = Number(hist[0].winOdds);
  const last = Number(hist[hist.length - 1].winOdds);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return "stable";
  const ratio = last / first;
  if (ratio <= 0.9) return "shortening";
  if (ratio >= 1.1) return "drifting";
  return "stable";
}

export const OddsHistoryManager = {
  record: recordOddsChange,
  load: loadOddsHistory,
  diff: diffOdds,
  trend: summarizeOddsTrend,
};
