/* ========================================
   PAPAPA IQ KEIBA - Market utils
   Ver5.4 Market Intelligence AI
   ======================================== */

export function clamp(value, min = 0, max = 100) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function toNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function avg(list) {
  const arr = (list || []).filter((v) => Number.isFinite(Number(v)));
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + Number(v), 0) / arr.length;
}

export function hashSeed(...parts) {
  const text = parts.map((p) => String(p ?? "")).join("|");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * 本文・投稿テキストを破棄し、シグナル語だけ数える（転載禁止）
 */
export function extractSignalFlags(text = "") {
  const s = String(text || "");
  return {
    positive:
      countMatches(s, [
        "好調",
        "安定",
        "本命",
        "強い",
        "期待",
        "上昇",
        "良馬場",
        "注目",
      ]) > 0,
    negative:
      countMatches(s, [
        "不安",
        "危険",
        "故障",
        "除外",
        "取消",
        "乗り替わり",
        "不振",
        "懸念",
      ]) > 0,
    injury: /故障|骨折|炎症/.test(s),
    jockeyChange: /乗り替わり|騎乗変更|乗り替/.test(s),
    scratched: /除外|取消|出走取消/.test(s),
    attention: /注目|話題|急上昇|本命|穴/.test(s),
  };
}

function countMatches(text, words) {
  let n = 0;
  for (const w of words) {
    if (text.includes(w)) n += 1;
  }
  return n;
}
