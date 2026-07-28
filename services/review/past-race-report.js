/* ========================================
   Past Race Report — Ver10.9.2
   過去レース: 結果 / レース前AI評価 / 勝因 / 推奨外れ考察
   （ai-engine.js 非改変）
   ======================================== */

import { API_BASE_URL } from "../../js/config.js";
import { analyzeWinner } from "./winner-analyzer.js";
import { analyzeLosers } from "./loser-analyzer.js";
import { analyzeRaceFlow } from "./race-flow-analyzer.js";
import { integrateSources } from "./review-sources.js";
import { toNum } from "./utils.js";

export const PAST_RACE_REPORT_VERSION = "10.9.2";

/** 複勝圏外 = 馬券外（4着以下） */
const OUT_OF_MONEY_FINISH = 4;

let cachedCatalog = null;

export function isPastRaceDate(dateIso = "") {
  const d = String(dateIso || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const today = jstTodayIso();
  return d < today;
}

export function jstTodayIso() {
  const n = new Date();
  const jst = new Date(n.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

export async function loadPastRaceCatalog(force = false) {
  if (cachedCatalog && !force) return cachedCatalog;
  try {
    const res = await fetch(`${API_BASE_URL}results/past-races.json`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`past-races ${res.status}`);
    cachedCatalog = await res.json();
    return cachedCatalog;
  } catch {
    cachedCatalog = { races: [] };
    return cachedCatalog;
  }
}

export async function findPastRaceRecord(options = {}) {
  const catalog = await loadPastRaceCatalog();
  const races = Array.isArray(catalog?.races) ? catalog.races : [];
  const date = String(options.date || options.raceDate || "").slice(0, 10);
  const venueId = String(options.venueId || options.venue || "").toLowerCase();
  const raceNumber = Number(options.raceNumber || options.race || 0);
  const raceId = String(options.raceId || "").trim();

  if (raceId) {
    const byId = races.find((r) => String(r.raceId) === raceId);
    if (byId) return byId;
  }

  return (
    races.find(
      (r) =>
        (!date || r.date === date) &&
        (!venueId || String(r.venueId).toLowerCase() === venueId) &&
        (!raceNumber || Number(r.raceNumber) === raceNumber)
    ) || null
  );
}

/**
 * 過去レース振り返りレポートを構築
 */
export async function buildPastRaceReport(options = {}) {
  const record = options.record || (await findPastRaceRecord(options));
  if (!record || !Array.isArray(record.results) || !record.results.length) {
    return {
      ok: false,
      available: false,
      version: PAST_RACE_REPORT_VERSION,
      message: "このレースの結果データはまだありません",
      userMessage: "このレースの結果データはまだありません",
    };
  }

  const prediction = normalizePrediction(record.prediction || {});
  const rows = buildResultRows(record.results, prediction);
  const race = {
    id: record.raceId,
    raceId: record.raceId,
    date: record.date,
    venueId: record.venueId,
    venueLabel: record.venueLabel,
    number: record.raceNumber,
    name: record.raceName,
    track: record.track,
    distance: record.distance,
    trackCondition: record.trackCondition,
    weather: record.weather,
  };

  const entries = rows.map((r) => ({
    number: r.number,
    name: r.horseName,
    horseName: r.horseName,
    finish: r.finish,
    popularity: r.popularity,
    odds: r.odds,
    jockey: r.jockey,
    aiScore: r.aiScore,
    aiRole: r.aiRole,
  }));

  const sources = integrateSources(
    {
      track: { condition: record.trackCondition || "良" },
      lap: { paceLabel: "標準" },
    },
    race
  );

  const winnerRow = rows.find((r) => r.finish === 1) || rows[0];
  const winnerAnalysis = analyzeWinner({
    winner: winnerRow
      ? {
          number: winnerRow.number,
          name: winnerRow.horseName,
          horseName: winnerRow.horseName,
          finish: 1,
          popularity: winnerRow.popularity,
        }
      : null,
    race,
    sources,
    prediction,
  });

  const loserAnalysis = analyzeLosers({
    entries,
    race,
    sources,
    prediction,
  });

  const raceFlow = analyzeRaceFlow({
    race,
    entries,
    sources,
    prediction,
  });

  const pickReviews = buildPickMissReviews(rows, prediction, winnerRow);

  return {
    ok: true,
    available: true,
    version: PAST_RACE_REPORT_VERSION,
    race,
    record,
    prediction,
    results: rows,
    winner: winnerRow,
    winnerAnalysis,
    loserAnalysis,
    raceFlow,
    pickReviews,
    summary: buildOverviewSummary(race, winnerRow, pickReviews, prediction),
  };
}

function normalizePrediction(raw = {}) {
  const honmei =
    Number(raw.honmei) ||
    findRoleNumber(raw.roles, "本命") ||
    null;
  const taikou =
    Number(raw.taikou) ||
    findRoleNumber(raw.roles, "対抗") ||
    null;
  const ana =
    Number(raw.ana) ||
    findRoleNumber(raw.roles, "穴") ||
    null;
  const scores = raw.scores || {};
  const indexes = raw.indexes || {};
  const roles = { ...(raw.roles || {}) };
  if (honmei && !roles[String(honmei)]) roles[String(honmei)] = "本命";
  if (taikou && !roles[String(taikou)]) roles[String(taikou)] = "対抗";
  if (ana && !roles[String(ana)]) roles[String(ana)] = "穴";

  const topNumbers =
    Array.isArray(raw.topNumbers) && raw.topNumbers.length
      ? raw.topNumbers.map(Number)
      : [honmei, taikou, ana].filter((n) => Number.isFinite(n) && n > 0);

  return {
    honmei,
    taikou,
    ana,
    roles,
    scores,
    indexes,
    topNumbers,
    generatedAt: raw.generatedAt || null,
    note: raw.note || "レース前AI評価",
  };
}

function findRoleNumber(roles = {}, label = "") {
  for (const [num, role] of Object.entries(roles || {})) {
    if (String(role).includes(label)) return Number(num);
  }
  return null;
}

function buildResultRows(results = [], prediction = {}) {
  return [...(results || [])]
    .map((r) => {
      const number = Number(r.number) || 0;
      const key = String(number);
      const aiScore =
        prediction.scores?.[key] != null
          ? Number(prediction.scores[key])
          : prediction.indexes?.[key] != null
            ? Math.round(Number(prediction.indexes[key]) / 10)
            : null;
      return {
        finish: Number(r.finish) || 99,
        number,
        horseName: r.horseName || r.horse || r.name || `馬${number}`,
        jockey: r.jockey || "",
        popularity: r.popularity != null ? Number(r.popularity) : null,
        odds: r.odds != null ? Number(r.odds) : null,
        payout: r.payout != null ? Number(r.payout) : 0,
        time: r.time || "",
        margin: r.margin || "",
        aiScore,
        aiIndex: prediction.indexes?.[key] != null ? Number(prediction.indexes[key]) : null,
        aiRole: prediction.roles?.[key] || null,
        inMoney: (Number(r.finish) || 99) < OUT_OF_MONEY_FINISH,
      };
    })
    .sort((a, b) => a.finish - b.finish);
}

/**
 * 本命・対抗・穴が馬券外だった場合の要因考察
 */
function buildPickMissReviews(rows = [], prediction = {}, winner = null) {
  const byNum = new Map(rows.map((r) => [r.number, r]));
  const picks = [
    { role: "本命", number: prediction.honmei, mark: "◎" },
    { role: "対抗", number: prediction.taikou, mark: "〇" },
    { role: "穴", number: prediction.ana, mark: "☆" },
  ].filter((p) => Number.isFinite(p.number) && p.number > 0);

  return picks.map((p) => {
    const row = byNum.get(p.number);
    if (!row) {
      return {
        ...p,
        found: false,
        hit: false,
        outOfMoney: true,
        finish: null,
        horseName: `馬${p.number}`,
        aiScore: prediction.scores?.[String(p.number)] ?? null,
        factors: ["該当馬の結果データがありません。"],
        explain: `${p.role}（${p.number}番）の着順データが不足しています。`,
      };
    }

    const outOfMoney = row.finish >= OUT_OF_MONEY_FINISH;
    const hit = !outOfMoney;
    const factors = outOfMoney
      ? buildMissFactors(row, winner, prediction, p.role)
      : [`${row.finish}着で複勝圏内。推奨は結果に対して妥当でした。`];

    return {
      ...p,
      found: true,
      hit,
      outOfMoney,
      finish: row.finish,
      horseName: row.horseName,
      popularity: row.popularity,
      aiScore: row.aiScore,
      factors,
      explain: outOfMoney
        ? buildMissExplain(p.role, row, winner, factors)
        : `${p.role}の${row.horseName}（${row.number}番）は${row.finish}着。馬券圏内でした。`,
    };
  });
}

function buildMissFactors(row, winner, prediction, role) {
  const factors = [];
  const finish = row.finish;
  const pop = row.popularity;

  if (finish >= 6) {
    factors.push("想定以上に着順を落とし、能力・展開の見立てが過大だった可能性");
  } else {
    factors.push("複勝圏までは届かず、僅差のポジション取りで不利になった可能性");
  }

  if (pop != null && pop <= 3 && finish >= OUT_OF_MONEY_FINISH) {
    factors.push("人気支持に対して市場過熱／期待値の読み違い");
  }

  if (winner && winner.popularity != null && pop != null && winner.popularity > pop) {
    factors.push(
      `勝ち馬（${winner.horseName}・${winner.popularity}番人気）への流れを過小評価`
    );
  }

  if (role === "本命") {
    factors.push("本命視した決め手が当日のペース／枠順に合わなかった");
  } else if (role === "対抗") {
    factors.push("対抗としての安定感を過信し、展開不利を織り込み不足");
  } else if (role === "穴") {
    factors.push("穴候補としての浮上条件（馬場・ペース）が揃わなかった");
  }

  const score = row.aiScore;
  if (score != null && score >= 80 && finish >= OUT_OF_MONEY_FINISH) {
    factors.push(`レース前AI評価 ${score}点と結果の乖離が大きく、再学習対象`);
  }

  return factors.slice(0, 4);
}

function buildMissExplain(role, row, winner, factors) {
  const winPart = winner
    ? `勝利馬は${winner.horseName}（${winner.number}番・${winner.finish}着）。`
    : "";
  return `${role}推奨の${row.horseName}（${row.number}番）は${row.finish}着で馬券外。${winPart}${(factors || []).join("／")}`;
}

function buildOverviewSummary(race, winner, pickReviews, prediction) {
  const venue = race.venueLabel || race.venueId || "";
  const title = `${race.date || ""} ${venue}${race.number || ""}R ${race.name || ""}`.trim();
  const winLine = winner
    ? `勝ち馬は${winner.horseName}（${winner.number}番・${winner.popularity ?? "—"}番人気）。`
    : "";
  const misses = (pickReviews || []).filter((p) => p.outOfMoney);
  const missLine = misses.length
    ? `AI推奨のうち馬券外は ${misses.map((m) => m.role).join("・")}。`
    : "AI推奨（本命・対抗・穴）はいずれも馬券圏内でした。";
  return `${title}の振り返り。${winLine}${missLine}レース前評価は ${prediction.note || "AIスコア"} を参照。`;
}

export const PastRaceReport = {
  build: buildPastRaceReport,
  find: findPastRaceRecord,
  loadCatalog: loadPastRaceCatalog,
  isPast: isPastRaceDate,
  version: PAST_RACE_REPORT_VERSION,
};
