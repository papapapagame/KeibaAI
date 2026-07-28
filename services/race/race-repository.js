/* ========================================
   RaceRepository — Ver7.3 / Ver7.4
   Provider Framework 経由取得（AIは直接触らない）
   ======================================== */

import { getSourceMode } from "../data/index.js";
import { acquireBundle } from "../provider/index.js";
import { API_BASE_URL } from "../../js/config.js";

export async function fetchRaceBundle(options = {}) {
  const mode = options.mode || getSourceMode();

  // Ver7.4: 必ず Provider Framework 経由
  const acquired = await acquireBundle({
    ...options,
    mode,
  });

  if (!acquired.ok || !acquired.raw) {
    return {
      ok: false,
      blocked: Boolean(acquired.blocked),
      providerId: acquired.providerId || (mode === "real" ? "real" : null),
      message: acquired.message || "Provider未接続",
      raw: null,
      framework: acquired.framework,
      provenance: acquired.provenance,
      failover: acquired.failover,
      merge: acquired.merge,
    };
  }

  const raw = acquired.raw;
  const enriched = await fetchEnrichedHorsesOptional();

  return {
    ok: true,
    blocked: false,
    providerId: acquired.providerId || "mock",
    message: acquired.message || "Provider Framework",
    raw: {
      race: raw.race || {},
      horses: mergeHorseEnrichment(raw.horses || [], enriched),
      settings: raw.settings || {},
      venues: raw.venues || [],
      races: raw.races || [],
    },
    count: acquired.count,
    fetchedAt: acquired.fetchedAt,
    provenance: acquired.provenance,
    failover: acquired.failover,
    merge: acquired.merge,
    framework: acquired.framework,
    sourceLabel: acquired.sourceLabel,
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
