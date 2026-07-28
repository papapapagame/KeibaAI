/* ========================================
   Odds Repository — Ver7.8
   ======================================== */

import { acquireBundle } from "../provider/index.js";
import { getSourceMode } from "../data/source-mode.js";
import { API_BASE_URL } from "../../js/config.js";

export async function fetchOddsRaw(options = {}) {
  const mode = options.mode || getSourceMode();

  if (mode === "real") {
    const acquired = await acquireBundle({ ...options, mode: "real" });
    if (!acquired.ok) {
      return {
        ok: false,
        blocked: true,
        message: acquired.message || "Provider未接続",
        providerId: acquired.providerId || "real",
        mode,
        items: [],
        phase: "none",
      };
    }
    const horses = acquired.raw?.horses || acquired.data?.horses || [];
    return {
      ok: true,
      blocked: false,
      message: "Real Odds via Framework",
      providerId: acquired.providerId,
      mode,
      items: horsesToOddsItems(horses),
      phase: "final",
      provenance: acquired.provenance,
      framework: acquired.framework,
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
      mode,
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
      mode,
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
