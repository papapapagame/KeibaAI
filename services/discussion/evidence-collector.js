/* ========================================
   Evidence Collector — Ver8.2
   各 Intelligence / Learning から独立 Evidence を収集
   ======================================== */

import {
  EVIDENCE_SOURCE,
  EVIDENCE_SOURCE_LABEL,
  SOURCE_BASE_WEIGHT,
  CLAIM_TYPE,
} from "./evidence-sources.js";

/**
 * @param {object} context — analysis bundles + packets
 */
export function collectEvidence(context = {}) {
  const now = context.now || Date.now();
  const list = [];

  pushHorse(list, context, now);
  pushRace(list, context, now);
  pushEntry(list, context, now);
  pushDraw(list, context, now);
  pushOdds(list, context, now);
  pushWeather(list, context, now);
  pushNews(list, context, now);
  pushSocial(list, context, now);
  pushLearning(list, context, now);

  return list.map((e, idx) => scoreEvidence(e, idx, now));
}

function scoreEvidence(raw, idx, now) {
  const updatedAt = raw.updatedAt || null;
  const freshness = freshnessScore(updatedAt, now);
  const coverage = clamp(Number(raw.coverage) || 0);
  const reliability = clamp(Number(raw.reliability) || 50);
  const importance = clamp(Number(raw.importance) || 50);
  const baseW = SOURCE_BASE_WEIGHT[raw.source] ?? 0.5;
  const confidence = clamp(
    Math.round(
      reliability * 0.35 +
        freshness * 0.2 +
        coverage * 0.2 +
        importance * 0.15 +
        baseW * 100 * 0.1
    )
  );

  return {
    id: raw.id || `ev_${raw.source}_${idx}`,
    source: raw.source,
    sourceLabel: EVIDENCE_SOURCE_LABEL[raw.source] || raw.source,
    claimType: raw.claimType || CLAIM_TYPE.CONFIDENCE,
    claim: raw.claim || "",
    subject: raw.subject || null,
    value: raw.value ?? null,
    polarity: raw.polarity || "neutral", // positive | negative | neutral
    horseNames: Array.isArray(raw.horseNames) ? raw.horseNames : [],
    updatedAt,
    scores: {
      confidence,
      freshness,
      reliability,
      coverage,
      importance,
    },
    weightBase: baseW,
    meta: raw.meta || {},
    available: raw.available !== false,
  };
}

function pushHorse(list, ctx, now) {
  const horses = ctx.horses || [];
  const n = horses.length;
  const withForm = horses.filter(
    (h) => (h.last3 && h.last3.length) || (h.history && h.history.length)
  ).length;
  const coverage = n ? Math.round((withForm / n) * 100) : 0;
  list.push({
    id: "ev_horse_field",
    source: EVIDENCE_SOURCE.HORSE,
    claimType: CLAIM_TYPE.FORM,
    claim: `出走馬データ ${n}頭 / 近走情報 ${withForm}頭`,
    subject: "field",
    value: n,
    polarity: n >= 8 ? "positive" : n > 0 ? "neutral" : "negative",
    coverage,
    reliability: n ? 80 : 20,
    importance: 70,
    updatedAt: ctx.fetchedAt || new Date(now).toISOString(),
    available: n > 0,
    meta: { horseCount: n, withForm },
  });

  const top = [...horses]
    .filter((h) => Number(h.winRate) > 0 || Number(h.stars) > 0)
    .sort(
      (a, b) =>
        (Number(b.stars) || 0) - (Number(a.stars) || 0) ||
        (Number(b.winRate) || 0) - (Number(a.winRate) || 0)
    )[0];
  if (top) {
    const name = top.horse || top.horseName || "";
    list.push({
      id: `ev_horse_form_${top.number || name}`,
      source: EVIDENCE_SOURCE.HORSE,
      claimType: CLAIM_TYPE.FORM,
      claim: `能力優位候補: ${name}`,
      subject: "horse",
      value: Number(top.stars) || Number(top.winRate) || 0,
      polarity: "positive",
      horseNames: name ? [name] : [],
      coverage: 60,
      reliability: 72,
      importance: 65,
      updatedAt: ctx.fetchedAt || new Date(now).toISOString(),
      meta: { number: top.number },
    });
  }
}

function pushRace(list, ctx) {
  const race = ctx.race || {};
  const ok = Boolean(race.number || race.raceName || race.name);
  list.push({
    id: "ev_race_core",
    source: EVIDENCE_SOURCE.RACE,
    claimType: CLAIM_TYPE.STAGE,
    claim: ok
      ? `レース情報: ${race.raceName || race.name || `${race.number}R`}`
      : "レース情報不足",
    subject: "race",
    value: race.number || null,
    polarity: ok ? "positive" : "negative",
    coverage: ok ? 90 : 10,
    reliability: ok ? 88 : 20,
    importance: 85,
    updatedAt: race.updatedAt || ctx.fetchedAt || null,
    available: ok,
    meta: {
      distance: race.distance,
      track: race.track || race.surface,
      grade: race.grade,
    },
  });
}

function pushEntry(list, ctx) {
  const bundle = ctx.entryBundle || {};
  const entries = bundle.entries || [];
  const ok = bundle.ok !== false && entries.length > 0;
  const scratched = entries.filter(
    (e) =>
      e.entryStatus === "scratched" ||
      e.entryStatus === "excluded" ||
      e.status === "scratched"
  );
  list.push({
    id: "ev_entry_count",
    source: EVIDENCE_SOURCE.ENTRY,
    claimType: CLAIM_TYPE.FIELD_SIZE,
    claim: ok
      ? `登録 ${entries.length}頭（取消/除外 ${scratched.length}）`
      : "登録情報なし",
    subject: "entry",
    value: entries.length,
    polarity: ok ? "positive" : "negative",
    coverage: Number(bundle.entryCompleteness?.overall) || (ok ? 70 : 0),
    reliability: ok ? 92 : 15,
    importance: 90,
    updatedAt: bundle.fetchedAt || null,
    available: ok,
    horseNames: scratched
      .map((e) => e.horse || e.horseName)
      .filter(Boolean),
    meta: { scratched: scratched.length, stage: bundle.confirmedStage },
  });

  if (scratched.length) {
    list.push({
      id: "ev_entry_scratch",
      source: EVIDENCE_SOURCE.ENTRY,
      claimType: CLAIM_TYPE.SCRATCH,
      claim: `出走取消/除外 ${scratched.length}頭`,
      subject: "scratch",
      value: scratched.length,
      polarity: "negative",
      horseNames: scratched
        .map((e) => e.horse || e.horseName)
        .filter(Boolean),
      coverage: 100,
      reliability: 95,
      importance: 95,
      updatedAt: bundle.fetchedAt || null,
      available: true,
    });
  }
}

function pushDraw(list, ctx) {
  const bundle = ctx.drawBundle || {};
  const ok = Boolean(bundle.ok);
  const comp = Number(bundle.drawCompleteness?.overall) || 0;
  list.push({
    id: "ev_draw_status",
    source: EVIDENCE_SOURCE.DRAW,
    claimType: CLAIM_TYPE.STAGE,
    claim: ok
      ? `枠順/騎手確定状況 Stage${bundle.confirmedStage ?? "—"}`
      : "枠順未確定",
    subject: "draw",
    value: bundle.confirmedStage ?? 0,
    polarity: ok && comp >= 50 ? "positive" : "neutral",
    coverage: comp,
    reliability: ok ? 86 : 25,
    importance: 80,
    updatedAt: bundle.fetchedAt || null,
    available: ok,
    meta: { completeness: comp },
  });
}

function pushOdds(list, ctx) {
  const bundle = ctx.oddsBundle || {};
  const ok = Boolean(bundle.ok);
  const items = bundle.items || bundle.odds || [];
  const favorite = [...(ctx.horses || [])]
    .filter((h) => {
      const pop =
        typeof h.popularity === "object" ? h.popularity?.value : h.popularity;
      return Number(pop) === 1;
    })[0];
  const favName = favorite
    ? favorite.horse || favorite.horseName || ""
    : "";
  const favOdds =
    favorite && typeof favorite.odds === "object"
      ? favorite.odds.win
      : favorite?.odds;

  list.push({
    id: "ev_odds_market",
    source: EVIDENCE_SOURCE.ODDS,
    claimType: CLAIM_TYPE.MARKET,
    claim: ok
      ? `市場データ取得 ${items.length || (ctx.horses || []).length}件`
      : "オッズ未取得",
    subject: "odds",
    value: items.length || null,
    polarity: ok ? "positive" : "negative",
    coverage: Number(bundle.oddsCompleteness?.overall) || (ok ? 75 : 0),
    reliability: ok ? 84 : 20,
    importance: 78,
    updatedAt: bundle.fetchedAt || null,
    available: ok,
  });

  if (favName) {
    list.push({
      id: "ev_odds_favorite",
      source: EVIDENCE_SOURCE.ODDS,
      claimType: CLAIM_TYPE.FAVORITE,
      claim: `1番人気: ${favName}${favOdds != null ? ` (${favOdds}倍)` : ""}`,
      subject: "horse",
      value: Number(favOdds) || 1,
      polarity: "positive",
      horseNames: [favName],
      coverage: 90,
      reliability: 88,
      importance: 82,
      updatedAt: bundle.fetchedAt || null,
      available: true,
      meta: { popularity: 1 },
    });
  }
}

function pushWeather(list, ctx) {
  const bundle = ctx.weatherBundle || {};
  const race = ctx.race || {};
  const ok = Boolean(bundle.ok);
  const weather = race.weather || bundle.weather?.label || bundle.label || "";
  const track =
    race.trackCondition || bundle.trackCondition || bundle.track?.label || "";
  list.push({
    id: "ev_weather",
    source: EVIDENCE_SOURCE.WEATHER,
    claimType: CLAIM_TYPE.WEATHER,
    claim: ok
      ? `天候 ${weather || "—"} / 馬場 ${track || "—"}`
      : "天候・馬場未取得",
    subject: "weather",
    value: weather || null,
    polarity: ok ? "positive" : "negative",
    coverage: Number(bundle.weatherCompleteness?.overall) || (ok ? 70 : 0),
    reliability: ok ? 83 : 20,
    importance: 75,
    updatedAt: bundle.fetchedAt || null,
    available: ok,
    meta: { trackCondition: track },
  });

  if (track) {
    list.push({
      id: "ev_track_condition",
      source: EVIDENCE_SOURCE.WEATHER,
      claimType: CLAIM_TYPE.TRACK_CONDITION,
      claim: `馬場状態: ${track}`,
      subject: "track",
      value: track,
      polarity: track === "良" ? "positive" : "neutral",
      coverage: 85,
      reliability: ok ? 85 : 40,
      importance: 72,
      updatedAt: bundle.fetchedAt || null,
      available: true,
    });
  }
}

function pushNews(list, ctx) {
  const bundle = ctx.newsBundle || {};
  const items = bundle.items || [];
  const ok = Boolean(bundle.ok) && items.length > 0;
  list.push({
    id: "ev_news_meta",
    source: EVIDENCE_SOURCE.NEWS,
    claimType: CLAIM_TYPE.CONFIDENCE,
    claim: ok
      ? `ニュース構造化 ${items.length}件 / 重要 ${bundle.stats?.important ?? 0}`
      : "ニュースなし",
    subject: "news",
    value: items.length,
    polarity: ok ? "positive" : "neutral",
    coverage: Number(bundle.newsCompleteness?.news) || (ok ? 100 : 0),
    reliability: ok ? 70 : 30,
    importance: ok ? 68 : 20,
    updatedAt: bundle.fetchedAt || null,
    available: ok,
  });

  const scratches = items.filter((n) => n.category === "scratch");
  if (scratches.length) {
    const names = scratches.flatMap((n) => n.horses || []);
    list.push({
      id: "ev_news_scratch",
      source: EVIDENCE_SOURCE.NEWS,
      claimType: CLAIM_TYPE.SCRATCH,
      claim: `ニュース取消情報 ${scratches.length}件`,
      subject: "scratch",
      value: scratches.length,
      polarity: "negative",
      horseNames: names,
      coverage: 80,
      reliability: 65,
      importance: 88,
      updatedAt: bundle.fetchedAt || null,
      available: true,
    });
  }

  const training = items.filter(
    (n) => n.category === "training" && (n.importanceScore || 0) >= 70
  );
  if (training.length) {
    list.push({
      id: "ev_news_training",
      source: EVIDENCE_SOURCE.NEWS,
      claimType: CLAIM_TYPE.FORM,
      claim: `調教注目ニュース ${training.length}件`,
      subject: "training",
      value: training.length,
      polarity: "positive",
      horseNames: training.flatMap((n) => n.horses || []),
      coverage: 60,
      reliability: 62,
      importance: 70,
      updatedAt: bundle.fetchedAt || null,
      available: true,
    });
  }
}

function pushSocial(list, ctx) {
  const bundle = ctx.socialBundle || {};
  const trends = bundle.trends || null;
  const ok = Boolean(bundle.ok) && (trends?.itemCount || 0) > 0;
  list.push({
    id: "ev_social_trend",
    source: EVIDENCE_SOURCE.SOCIAL,
    claimType: CLAIM_TYPE.BUZZ,
    claim: ok
      ? `SNS解析 ${trends.itemCount}話題 / Trend ${trends.scores?.trend ?? "—"}`
      : "SNSトレンドなし",
    subject: "social",
    value: trends?.scores?.trend ?? 0,
    polarity: ok ? "positive" : "neutral",
    coverage: Number(bundle.socialCompleteness?.sns) || (ok ? 100 : 0),
    reliability: ok ? Number(trends?.scores?.confidence) || 55 : 25,
    importance: ok ? 60 : 15,
    updatedAt: bundle.fetchedAt || null,
    available: ok,
    meta: {
      topCategories: trends?.topCategories || [],
      attention: trends?.scores?.attention,
    },
  });

  const topHorse = (trends?.horses || [])[0];
  if (topHorse?.horse) {
    list.push({
      id: "ev_social_buzz_horse",
      source: EVIDENCE_SOURCE.SOCIAL,
      claimType: CLAIM_TYPE.BUZZ,
      claim: `SNS注目馬: ${topHorse.horse}`,
      subject: "horse",
      value: topHorse.scores?.trend ?? 0,
      polarity: "positive",
      horseNames: [topHorse.horse],
      coverage: 55,
      reliability: topHorse.scores?.confidence || 50,
      importance: 58,
      updatedAt: bundle.fetchedAt || null,
      available: true,
    });
  }

  const scratchTopics = (trends?.items || []).filter(
    (i) => i.category === "scratch"
  );
  if (scratchTopics.length) {
    list.push({
      id: "ev_social_scratch",
      source: EVIDENCE_SOURCE.SOCIAL,
      claimType: CLAIM_TYPE.SCRATCH,
      claim: `SNS取消話題 ${scratchTopics.length}`,
      subject: "scratch",
      value: scratchTopics.length,
      polarity: "negative",
      horseNames: scratchTopics.flatMap((i) => i.horses || []),
      coverage: 50,
      reliability: 48,
      importance: 75,
      updatedAt: bundle.fetchedAt || null,
      available: true,
    });
  }
}

function pushLearning(list, ctx) {
  const dash = ctx.learningDashboard || {};
  const records = dash.recent || dash.recentRecords || dash.records || [];
  const count =
    Number(dash.dbMeta?.recordCount ?? dash.recordCount ?? records.length) || 0;
  const ok = count > 0;
  const hitRate = Number(
    dash.performance?.hitRate ?? dash.performance?.placeHitRate ?? dash.hitRate
  );
  list.push({
    id: "ev_learning",
    source: EVIDENCE_SOURCE.LEARNING,
    claimType: CLAIM_TYPE.CONFIDENCE,
    claim: ok
      ? `学習履歴 ${count}件${Number.isFinite(hitRate) ? ` / 指標 ${Math.round(hitRate * (hitRate <= 1 ? 100 : 1))}%` : ""}`
      : "学習データなし",
    subject: "learning",
    value: count,
    polarity: ok ? "positive" : "neutral",
    coverage: ok ? Math.min(100, count * 10) : 0,
    reliability: ok ? 68 : 20,
    importance: 55,
    updatedAt: dash.dbMeta?.updatedAt || dash.updatedAt || null,
    available: ok,
    meta: { hitRate: Number.isFinite(hitRate) ? hitRate : null },
  });
}

function freshnessScore(iso, now) {
  if (!iso) return 40;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 40;
  const hours = (now - t) / 3600000;
  if (hours <= 1) return 100;
  if (hours <= 6) return 85;
  if (hours <= 24) return 70;
  if (hours <= 72) return 50;
  return 30;
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(n) || 0));
}

export const EvidenceCollector = { collect: collectEvidence };
