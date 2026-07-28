/* ========================================
   Review Sources — Ver6.5
   公開情報を統合（本文・投稿本文は保持せず要約シグナルのみ）
   ======================================== */

import { API_BASE_URL } from "../../js/config.js";
import { hashSeed, toNum } from "./utils.js";

/**
 * 同一オリジンのレビュー用フィードを読み込み、
 * 記事・SNS本文を捨てて AI が使えるシグナルだけ返す。
 */
export async function loadReviewSources(raceHint = {}) {
  const feed = await fetchReviewFeed();
  return integrateSources(feed, raceHint);
}

async function fetchReviewFeed() {
  try {
    const url = `${API_BASE_URL}intelligence/review-feed.json`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return emptyFeed();
    const json = await res.json();
    return json && typeof json === "object" ? json : emptyFeed();
  } catch {
    return emptyFeed();
  }
}

function emptyFeed() {
  return {
    version: "6.5.0",
    races: [],
    signals: [],
  };
}

/**
 * 公開情報ソースを正規化。
 * body / content / text / post などの本文フィールドは破棄する。
 */
export function integrateSources(feed, raceHint = {}) {
  const raceId =
    raceHint.raceId ||
    raceHint.id ||
    (raceHint.venueLabel && raceHint.number
      ? `${raceHint.venueLabel}-${raceHint.number}`
      : null);

  const races = Array.isArray(feed?.races) ? feed.races : [];
  const matched =
    races.find((r) => r.raceId === raceId) ||
    races.find(
      (r) =>
        String(r.venueLabel || "") === String(raceHint.venueLabel || "") &&
        toNum(r.number) === toNum(raceHint.number)
    ) ||
    races[0] ||
    null;

  const signals = [
    ...(Array.isArray(feed?.signals) ? feed.signals : []),
    ...(Array.isArray(matched?.signals) ? matched.signals : []),
  ].map(sanitizeSignal);

  return {
    raceId: matched?.raceId || raceId || "unknown",
    official: sanitizeOfficial(matched?.official || raceHint),
    lap: sanitizeLap(matched?.lap),
    payout: sanitizePayout(matched?.payout),
    track: sanitizeTrack(matched?.track || raceHint),
    weather: matched?.weather || raceHint.weather || "不明",
    training: (matched?.training || []).map(sanitizeTraining),
    newsSignals: (matched?.news || []).map(sanitizeNews),
    jockeyComments: (matched?.jockeyComments || []).map(sanitizeComment),
    trainerComments: (matched?.trainerComments || []).map(sanitizeComment),
    marketX: sanitizeMarket(matched?.marketX),
    expert: (matched?.expert || []).map(sanitizeExpert),
    signals,
    sourceCount: countSources(matched, signals),
    policy: {
      displayBodiesForbidden: true,
      aiSummaryOnly: true,
    },
  };
}

function stripBody(obj) {
  if (!obj || typeof obj !== "object") return {};
  const banned = [
    "body",
    "content",
    "text",
    "post",
    "article",
    "raw",
    "html",
    "message",
  ];
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (banned.includes(k)) continue;
    out[k] = v;
  }
  return out;
}

function sanitizeSignal(s) {
  const clean = stripBody(s);
  return {
    type: clean.type || "signal",
    label: clean.label || clean.topic || "公開情報シグナル",
    tone: clean.tone || "neutral",
    strength: toNum(clean.strength, 50),
    horseId: clean.horseId ?? clean.number ?? null,
    summary: clean.summary || clean.insight || "公開情報から抽出した要約シグナル",
  };
}

function sanitizeOfficial(o) {
  const clean = stripBody(o || {});
  return {
    venueLabel: clean.venueLabel || "",
    number: toNum(clean.number),
    name: clean.name || clean.raceName || "",
    track: clean.track || "",
    distance: toNum(clean.distance),
    trackCondition: clean.trackCondition || clean.condition || "",
    finishOrder: Array.isArray(clean.finishOrder) ? clean.finishOrder : null,
  };
}

function sanitizeLap(lap) {
  if (!lap) return { paceLabel: "標準", sections: [], summary: "ラップ情報なし" };
  const clean = stripBody(lap);
  return {
    paceLabel: clean.paceLabel || "標準",
    first3f: clean.first3f ?? null,
    last3f: clean.last3f ?? null,
    sections: Array.isArray(clean.sections) ? clean.sections.slice(0, 8) : [],
    summary: clean.summary || `${clean.paceLabel || "標準"}ペースと推定`,
  };
}

function sanitizePayout(p) {
  const clean = stripBody(p || {});
  return {
    win: toNum(clean.win),
    place: toNum(clean.place),
    quinella: toNum(clean.quinella),
    trio: toNum(clean.trio),
    summary: clean.summary || "払戻は公開情報から参照（詳細転載なし）",
  };
}

function sanitizeTrack(t) {
  const clean = stripBody(t || {});
  return {
    condition: clean.trackCondition || clean.condition || "良",
    bias: clean.bias || "フラット",
    speed: clean.speed || "標準",
    summary: clean.summary || "馬場は公開情報に基づく要約のみ",
  };
}

function sanitizeTraining(t) {
  const clean = stripBody(t || {});
  return {
    horseId: clean.horseId ?? clean.number ?? null,
    tone: clean.tone || "普通",
    summary: clean.summary || "調教は仕上がりシグナルのみ保持",
  };
}

function sanitizeNews(n) {
  const clean = stripBody(n || {});
  return {
    topic: clean.topic || clean.label || "レース後ニュース",
    tone: clean.tone || "neutral",
    summary: clean.summary || "ニュース要約（本文非表示）",
  };
}

function sanitizeComment(c) {
  const clean = stripBody(c || {});
  return {
    horseId: clean.horseId ?? clean.number ?? null,
    role: clean.role || "comment",
    sentiment: clean.sentiment || "neutral",
    summary: clean.summary || "コメント要約（原文非表示）",
  };
}

function sanitizeMarket(m) {
  const clean = stripBody(m || {});
  return {
    heat: toNum(clean.heat, 50),
    sentiment: clean.sentiment || "中立",
    overheat: Boolean(clean.overheat),
    summary: clean.summary || "X市場反応は感情・熱量シグナルのみ",
  };
}

function sanitizeExpert(e) {
  const clean = stripBody(e || {});
  return {
    stance: clean.stance || "中立",
    focus: clean.focus || "展開",
    summary: clean.summary || "専門家分析の要約のみ",
  };
}

function countSources(matched, signals) {
  if (!matched) return signals.length;
  let n = signals.length;
  if (matched.official) n += 1;
  if (matched.lap) n += 1;
  if (matched.payout) n += 1;
  if (matched.track) n += 1;
  n += (matched.news || []).length;
  n += (matched.jockeyComments || []).length;
  n += (matched.trainerComments || []).length;
  if (matched.marketX) n += 1;
  n += (matched.expert || []).length;
  return n;
}

/** ソースから決定論的シードを作る（再現可能な考察用） */
export function sourcesSeed(sources, extra = "") {
  return hashSeed(
    sources?.raceId,
    sources?.track?.condition,
    sources?.lap?.paceLabel,
    sources?.marketX?.heat,
    extra
  );
}
