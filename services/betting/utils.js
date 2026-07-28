/* ========================================
   Betting utils — Ver6.0
   ======================================== */

export function clamp(v, min = 0, max = 100) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function toNum(v, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

export function horseName(h) {
  return h?.name || h?.horse || `馬${h?.number || "?"}`;
}

export function combinations(arr, k) {
  const list = Array.isArray(arr) ? arr : [];
  if (k <= 0 || k > list.length) return [];
  const out = [];
  const walk = (start, path) => {
    if (path.length === k) {
      out.push([...path]);
      return;
    }
    for (let i = start; i < list.length; i += 1) {
      path.push(list[i]);
      walk(i + 1, path);
      path.pop();
    }
  };
  walk(0, []);
  return out;
}

export function permutations(arr) {
  const list = Array.isArray(arr) ? arr : [];
  if (list.length <= 1) return [list];
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    const rest = list.slice(0, i).concat(list.slice(i + 1));
    for (const p of permutations(rest)) out.push([list[i], ...p]);
  }
  return out;
}

export function uniqueTickets(tickets) {
  const seen = new Set();
  const out = [];
  for (const t of tickets) {
    const key = `${t.type}|${t.formation}|${t.selection}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}
