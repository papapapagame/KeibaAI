/* ========================================
   Odds Repository — Ver7.8 / Ver10.2
   ======================================== */

import { API_BASE_URL } from "../../js/config.js";
import { getOddsMode } from "./odds-mode.js";
import { loadRealOdds } from "../provider/odds/index.js";

export async function fetchOddsRaw(options = {}) {
  const oddsMode = options.oddsMode || getOddsMode();

  // Ver10.2 Real Odds（自動 Mock フォールバックなし）
  if (oddsMode === "real") {
    const real = await loadRealOdds({
      ...options,
      stage: options.stage,
      force: options.forceRefresh || options.force,
      silent: options.silent !== false,
      emitUpdate: options.emitUpdate === true,
    });
    if (!real.ok) {
      return {
        ok: false,
        blocked: false,
        message: real.userMessage || "現在データを取得できません",
        userMessage: "現在データを取得できません",
        providerId: real.providerId || "real-odds",
        mode: "real",
        items: [],
        phase: "none",
        validation: real.validation,
        error: real.error || null,
      };
    }
    return {
      ok: true,
      blocked: false,
      message: real.message || "Real Odds",
      providerId: real.providerId || "real-odds",
      providerName: real.providerName || "Real Odds",
      mode: "real",
      items: real.odds || real.items || [],
      phase: real.phase || "final",
      meta: {
        ...(real.meta || {}),
        updatedAt: real.updatedAt || real.fetchedAt,
        phase: real.phase || "final",
        skipped: real.skipped,
        changed: real.changed,
        fingerprint: real.fingerprint,
        updateCount: real.updateCount,
        marketStatus: real.marketStatus,
      },
      realBundle: real,
      validation: real.validation,
      provenance: { providerId: real.providerId, source: "real-odds" },
    };
  }

  try {
    const oddsJson = await fetchJsonOptional("odds/mock-odds.json");
    const horsesJson = await fetchJsonOptional("horses.json");
    const items =
      oddsJson?.odds || horsesToOddsItems(horsesJson?.entries || []);

    return {
      ok: true,
      blocked: false,
      message: "Mock Odds Repository",
      providerId: "mock",
      mode: "mock",
      items,
      phase: oddsJson?.phase || "final",
      meta: {
        raceDate: options.date || oddsJson?.raceDate || null,
        venueId: options.venueId || oddsJson?.venueId || null,
        raceNumber: options.raceNumber || oddsJson?.raceNumber || null,
        updatedAt: oddsJson?.updatedAt || new Date().toISOString(),
        phase: oddsJson?.phase || "final",
      },
    };
  } catch (err) {
    return {
      ok: false,
      blocked: false,
      message: err?.message || "Odds fetch failed",
      providerId: "mock",
      mode: "mock",
      items: [],
      phase: "none",
    };
  }
}

function horsesToOddsItems(horses = []) {
  return (horses || [])
    .filter((h) => !h.scratched && !h.excluded)
    .map((h) => ({
      number: Number(h.number) || 0,
      horse: h.horse || h.horseName || "",
      winOdds: Number(h.odds) || null,
      placeOdds: h.placeOdds != null ? Number(h.placeOdds) : null,
      popularity: Number(h.popularity) || null,
      marketIndex: h.marketIndex != null ? Number(h.marketIndex) : null,
      updatedAt: h.oddsUpdatedAt || null,
      history: Array.isArray(h.oddsHistory) ? h.oddsHistory : [],
    }));
}

async function fetchJsonOptional(path) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const OddsRepository = { fetch: fetchOddsRaw };
