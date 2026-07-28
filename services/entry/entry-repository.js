/* ========================================
   Entry Repository — Ver7.6
   Provider Framework 経由（直アクセス禁止）
   ======================================== */

import { acquireBundle } from "../provider/index.js";
import { getSourceMode } from "../data/source-mode.js";
import { API_BASE_URL } from "../../js/config.js";

export async function fetchEntryRaw(options = {}) {
  const mode = options.mode || getSourceMode();

  if (mode === "real") {
    // Real: Framework 経由。未接続ならブロック
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
    return {
      ok: true,
      blocked: false,
      message: "Real Entry via Framework",
      providerId: acquired.providerId,
      mode,
      items: stripConfirmedFields(acquired.raw?.horses || acquired.data?.horses || []),
      provenance: acquired.provenance,
      framework: acquired.framework,
    };
  }

  // Mock / Auto: 専用 Entry JSON + horses 補完
  try {
    const [entryJson, horsesJson] = await Promise.all([
      fetchJsonOptional("entry/mock-entries.json"),
      fetchJsonOptional("horses.json"),
    ]);

    const base =
      entryJson?.entries ||
      horsesJson?.entries ||
      [];
    const items = mergeEntryHints(base, entryJson?.statusMap || {});

    return {
      ok: true,
      blocked: false,
      message: "Mock Entry Repository",
      providerId: "mock",
      mode,
      items: stripConfirmedFields(items),
      meta: {
        raceDate: options.date || entryJson?.raceDate || null,
        venueId: options.venueId || entryJson?.venueId || null,
        raceNumber: options.raceNumber || entryJson?.raceNumber || null,
        updatedAt: entryJson?.updatedAt || new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      ok: false,
      blocked: false,
      message: err?.message || "Entry fetch failed",
      providerId: "mock",
      mode,
      items: [],
    };
  }
}

/** 枠・騎手・斤量・オッズは確定情報として保持しない */
function stripConfirmedFields(items = []) {
  return (items || []).map((h) => {
    const {
      frame: _f,
      jockey: _j,
      weight: _w,
      odds: _o,
      popularity: _p,
      favorite: _fav,
      ...rest
    } = h || {};
    return {
      ...rest,
      // 明示的に未確定フラグ
      frame: null,
      jockey: null,
      weight: null,
      odds: null,
      popularity: null,
      _frameUnconfirmed: true,
      _jockeyUnconfirmed: true,
      _weightUnconfirmed: true,
      _oddsUnconfirmed: true,
    };
  });
}

function mergeEntryHints(items, statusMap = {}) {
  return (items || []).map((h, idx) => {
    const key = String(h.number ?? h.horseId ?? idx);
    const hint = statusMap[key] || statusMap[h.horse] || {};
    return {
      ...h,
      entryStatus: hint.entryStatus || h.entryStatus || defaultStatusByIndex(idx),
      affiliation: h.affiliation || hint.affiliation || guessAffiliation(h.trainer),
      careerRecord: h.careerRecord || hint.careerRecord || null,
      distanceRecord: h.distanceRecord || hint.distanceRecord || null,
      courseRecord: h.courseRecord || hint.courseRecord || null,
      trackRecord: h.trackRecord || hint.trackRecord || null,
      stakesRecord: h.stakesRecord || hint.stakesRecord || null,
      earnings: h.earnings ?? hint.earnings ?? null,
    };
  });
}

function defaultStatusByIndex(idx) {
  // Demo: 大半は出走予定、一部登録/取消/除外
  if (idx === 14) return "scratched";
  if (idx === 15) return "excluded";
  if (idx >= 12) return "registered";
  if (idx >= 10) return "planned";
  return "planned";
}

function guessAffiliation(trainer) {
  if (!trainer) return "美浦";
  const west = ["友道", "池江", "矢作", "音無", "松田"];
  return west.some((w) => String(trainer).includes(w)) ? "栗東" : "美浦";
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

export const EntryRepository = { fetch: fetchEntryRaw };
