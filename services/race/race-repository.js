/* ========================================
   RaceRepository — Ver7.3
   Provider 経由取得（AIは直接触らない）
   ======================================== */

import { getRaceBundleForAi, getSourceMode } from "../data/index.js";
import { API_BASE_URL } from "../../js/config.js";

export async function fetchRaceBundle(options = {}) {
  const mode = options.mode || getSourceMode();
  if (mode === "real") {
    return {
      ok: false,
      blocked: true,
      providerId: "real",
      message: "Provider未接続",
      raw: null,
    };
  }

  // Mock: Data Platform API（内部で MockProvider）
  const bundle = await getRaceBundleForAi(options);
  if (!bundle.ok) {
    return {
      ok: false,
      blocked: Boolean(bundle.blocked),
      providerId: bundle.providerId || "mock",
      message: bundle.message || "取得失敗",
      raw: null,
      platform: bundle,
    };
  }

  // 追加の enriched mock（年齢・性別など）をマージ
  const enriched = await fetchEnrichedHorsesOptional();

  return {
    ok: true,
    blocked: false,
    providerId: "mock",
    message: "Mock Race Repository",
    raw: {
      race: bundle.race,
      horses: mergeHorseEnrichment(bundle.horses || [], enriched),
      settings: bundle.settings || {},
    },
    platform: bundle,
    count: bundle.count,
  };
}

async function fetchEnrichedHorsesOptional() {
  try {
    const res = await fetch(`${API_BASE_URL}horses.json`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.entries || [];
  } catch {
    return [];
  }
}

function mergeHorseEnrichment(horses, enriched) {
  const map = new Map((enriched || []).map((h) => [Number(h.number), h]));
  return (horses || []).map((h) => {
    const e = map.get(Number(h.number));
    if (!e) return h;
    return {
      ...e,
      ...h,
      age: h.age ?? e.age,
      sex: h.sex || e.sex,
      horse: h.horse || e.horse,
      jockey: h.jockey || e.jockey,
      trainer: h.trainer || e.trainer,
    };
  });
}

export const RaceRepository = { fetchBundle: fetchRaceBundle };
