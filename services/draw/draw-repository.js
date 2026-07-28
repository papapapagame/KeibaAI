/* ========================================
   Draw Repository — Ver7.7
   Provider Framework 経由（直アクセス禁止）
   ======================================== */

import { acquireBundle } from "../provider/index.js";
import { getSourceMode } from "../data/source-mode.js";
import { API_BASE_URL } from "../../js/config.js";

export async function fetchDrawRaw(options = {}) {
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
      };
    }
    const horses = acquired.raw?.horses || acquired.data?.horses || [];
    return {
      ok: true,
      blocked: false,
      message: "Real Draw via Framework",
      providerId: acquired.providerId,
      mode,
      items: horsesToDrawItems(horses),
      provenance: acquired.provenance,
      framework: acquired.framework,
    };
  }

  try {
    const drawJson = await fetchJsonOptional("draw/mock-draw.json");
    const horsesJson = await fetchJsonOptional("horses.json");
    const items =
      drawJson?.draws ||
      horsesToDrawItems(horsesJson?.entries || []);

    return {
      ok: true,
      blocked: false,
      message: "Mock Draw Repository",
      providerId: "mock",
      mode,
      items,
      meta: {
        raceDate: options.date || drawJson?.raceDate || null,
        venueId: options.venueId || drawJson?.venueId || null,
        raceNumber: options.raceNumber || drawJson?.raceNumber || null,
        updatedAt: drawJson?.updatedAt || new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      ok: false,
      blocked: false,
      message: err?.message || "Draw fetch failed",
      providerId: "mock",
      mode,
      items: [],
    };
  }
}

function horsesToDrawItems(horses = []) {
  return (horses || []).map((h) => ({
    number: Number(h.number) || 0,
    frame: Number(h.frame) || 0,
    horse: h.horse || h.horseName || "",
    jockey: h.jockey || null,
    weight: h.weight != null ? Number(h.weight) : null,
    previousJockey: h.previousJockey || null,
    riderChanged: Boolean(h.riderChanged),
    scratched: Boolean(h.scratched),
    excluded: Boolean(h.excluded),
    frameConfirmed: h.frame != null && Number(h.frame) > 0,
    jockeyConfirmed: Boolean(h.jockey) && h.jockey !== "未定",
    weightConfirmed: h.weight != null && Number.isFinite(Number(h.weight)),
    jockeyHistory: h.jockeyHistory || [],
    weightHistory: h.weightHistory || [],
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

export const DrawRepository = { fetch: fetchDrawRaw };
