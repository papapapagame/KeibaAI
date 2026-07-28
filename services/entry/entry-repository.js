/* ========================================
   Entry Repository — Ver7.6 / Ver10.1
   Provider Framework 経由（直アクセス禁止）
   ======================================== */

import { API_BASE_URL } from "../../js/config.js";
import { getEntryMode } from "./entry-mode.js";
import { loadRealHorseEntries } from "../provider/horse/index.js";

export async function fetchEntryRaw(options = {}) {
  const entryMode = options.entryMode || getEntryMode();

  // Ver10.1 Real Horse Entry（自動 Mock フォールバックなし）
  if (entryMode === "real") {
    const real = await loadRealHorseEntries({
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
        providerId: real.providerId || "real-horse",
        mode: "real",
        items: [],
        validation: real.validation,
        error: real.error || null,
      };
    }
    return {
      ok: true,
      blocked: false,
      message: real.message || "Real Horse Entry",
      providerId: real.providerId || "real-horse",
      mode: "real",
      items: real.entries,
      meta: {
        ...(real.meta || {}),
        updatedAt: real.updatedAt || real.fetchedAt,
        confirmation: real.confirmation,
        skipped: real.skipped,
        changed: real.changed,
        fingerprint: real.fingerprint,
        defaultStage: real.meta?.defaultStage ?? options.stage ?? 5,
      },
      realBundle: real,
      provenance: { providerId: real.providerId, source: "real-horse" },
    };
  }

  // Mock: 専用 Entry JSON + horses 補完
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
      mode: "mock",
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
      mode: "mock",
      items: [],
    };
  }
}

/** Mock: 枠・騎手・斤量・オッズは確定情報として保持しない */
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
  if (idx === 14) return "scratched";
  if (idx === 15) return "excluded";
  if (idx >= 12) return "registered";
  return "entry_expected";
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
export const HorseEntryRepository = EntryRepository;
