/* ========================================
   Data Merge — Ver7.4
   複数 Provider 結果の統合
   ======================================== */

/**
 * 重複排除・優先順位・タイムスタンプ・品質を考慮して統合
 */
export function mergeProviderResults(results = [], options = {}) {
  const okResults = (results || []).filter((r) => r && r.ok && r.data != null);
  if (!okResults.length) {
    return {
      ok: false,
      merged: null,
      sources: [],
      strategy: "none",
      note: "マージ対象なし",
    };
  }

  if (okResults.length === 1) {
    return {
      ok: true,
      merged: okResults[0].data,
      sources: [summarize(okResults[0])],
      strategy: "single",
      note: "単一 Provider",
      primaryId: okResults[0].providerId,
    };
  }

  const kind = options.kind || "Bundle";
  if (kind === "Bundle" || kind === "Race") {
    return mergeBundles(okResults);
  }
  if (kind === "Horse" || kind === "Horses") {
    return mergeHorseLists(okResults);
  }
  // デフォルト: 最優先（先頭）を採用し、他は補完メタのみ
  return {
    ok: true,
    merged: okResults[0].data,
    sources: okResults.map(summarize),
    strategy: "priority-first",
    note: "優先 Provider を採用",
    primaryId: okResults[0].providerId,
  };
}

function mergeBundles(okResults) {
  const primary = okResults[0];
  const base = clone(primary.data) || {};
  const race = { ...(base.race || {}) };
  let horses = [...(base.horses || [])];
  const settings = { ...(base.settings || {}) };

  for (let i = 1; i < okResults.length; i += 1) {
    const next = okResults[i].data || {};
    fillMissing(race, next.race || {});
    horses = mergeHorseArrays(horses, next.horses || [], okResults[i].providerId);
    fillMissing(settings, next.settings || {});
  }

  return {
    ok: true,
    merged: {
      ...base,
      race,
      horses,
      settings,
      venues: base.venues || [],
      races: base.races || [],
    },
    sources: okResults.map(summarize),
    strategy: "priority-fill",
    note: "優先順で欠損補完・馬番重複排除",
    primaryId: primary.providerId,
  };
}

function mergeHorseLists(okResults) {
  let horses = [];
  for (const r of okResults) {
    const list = Array.isArray(r.data) ? r.data : r.data?.horses || [];
    horses = mergeHorseArrays(horses, list, r.providerId);
  }
  return {
    ok: true,
    merged: horses,
    sources: okResults.map(summarize),
    strategy: "dedupe-by-number",
    note: "馬番で重複排除（高優先を維持）",
    primaryId: okResults[0].providerId,
  };
}

function mergeHorseArrays(primary = [], secondary = [], secondaryId = "") {
  const map = new Map();
  for (const h of primary) {
    const key = Number(h?.number);
    if (!Number.isFinite(key)) continue;
    map.set(key, { ...h });
  }
  for (const h of secondary) {
    const key = Number(h?.number);
    if (!Number.isFinite(key)) continue;
    if (!map.has(key)) {
      map.set(key, { ...h, _mergedFrom: secondaryId });
      continue;
    }
    const cur = map.get(key);
    fillMissing(cur, h);
  }
  return [...map.values()].sort((a, b) => Number(a.number) - Number(b.number));
}

function fillMissing(target, source) {
  if (!target || !source) return;
  for (const [k, v] of Object.entries(source)) {
    if (v == null || v === "") continue;
    if (target[k] == null || target[k] === "") {
      target[k] = v;
    }
  }
}

function summarize(result) {
  return {
    providerId: result.providerId,
    fetchedAt: result.fetchedAt,
    quality: result.quality ?? scoreQuality(result),
    latencyMs: result.latencyMs ?? null,
    health: result.health || null,
  };
}

function scoreQuality(result) {
  // 実装済み・件数・エラー無しを簡易品質スコアに
  let q = 50;
  if (result.implemented) q += 20;
  if (result.ok) q += 20;
  const count = result.count?.horses ?? result.data?.horses?.length ?? 0;
  if (count >= 8) q += 10;
  return Math.min(100, q);
}

function clone(v) {
  try {
    return structuredClone(v);
  } catch {
    return JSON.parse(JSON.stringify(v ?? null));
  }
}

export const DataMerge = {
  merge: mergeProviderResults,
};
