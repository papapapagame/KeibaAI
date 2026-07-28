/* ========================================
   Entry Data Connector — Ver7.6
   ======================================== */

import { fetchEntryRaw } from "./entry-repository.js";
import { validateEntries } from "./entry-validator.js";
import { createHorseEntry } from "../models/unified.js";
import {
  ENTRY_STATUS_LABEL,
  normalizeEntryStatus,
} from "./entry-status.js";

export const ENTRY_ENGINE_VERSION = "7.6.0";

export async function connectEntryData(options = {}) {
  const fetched = await fetchEntryRaw(options);
  if (!fetched.ok) {
    return {
      ok: false,
      blocked: Boolean(fetched.blocked),
      message: fetched.message || "Entry 取得失敗",
      providerId: fetched.providerId,
      entries: [],
      unified: [],
      validation: {
        ok: false,
        errors: [{ code: "FETCH", message: fetched.message }],
        warnings: [],
      },
      version: ENTRY_ENGINE_VERSION,
    };
  }

  const validation = validateEntries(fetched.items || []);
  if (!validation.ok) {
    return {
      ok: false,
      blocked: false,
      message: "Entry Validation failed",
      providerId: fetched.providerId,
      entries: [],
      unified: [],
      validation,
      version: ENTRY_ENGINE_VERSION,
    };
  }

  const entries = validation.sanitized.map((raw) => toEntryRecord(raw));
  const unified = entries.map(createHorseEntry);

  return {
    ok: true,
    blocked: false,
    message: fetched.message || "Entry connected",
    providerId: fetched.providerId || "mock",
    mode: fetched.mode,
    entries,
    unified,
    validation,
    meta: fetched.meta || {},
    count: entries.length,
    fetchedAt: fetched.meta?.updatedAt || new Date().toISOString(),
    version: ENTRY_ENGINE_VERSION,
    provenance: fetched.provenance || null,
    framework: fetched.framework || null,
  };
}

export function toEntryRecord(raw = {}) {
  const status = normalizeEntryStatus(raw.entryStatus);
  return {
    horseId: raw.horseId || `H${String(raw.number).padStart(2, "0")}`,
    number: Number(raw.number) || 0,
    horseName: raw.horseName || raw.horse || raw.name || "",
    horse: raw.horseName || raw.horse || raw.name || "",
    sex: raw.sex || "",
    age: raw.age != null ? Number(raw.age) : null,
    affiliation: raw.affiliation || "",
    trainer: raw.trainer || raw.trainerName || "",
    runningStyle: raw.runningStyle || "",
    careerRecord: raw.careerRecord || buildCareerFromRates(raw),
    recentForm: raw.recentForm || raw.last3 || [],
    lastRace: raw.lastRace || "",
    last3: Array.isArray(raw.last3) ? raw.last3 : [],
    distanceRecord: raw.distanceRecord || raw.distanceType || "",
    courseRecord: raw.courseRecord || "",
    trackRecord: raw.trackRecord || raw.trackType || "",
    stakesRecord: raw.stakesRecord || raw.grade || "",
    earnings: raw.earnings != null ? Number(raw.earnings) : null,
    winRate: Number(raw.winRate) || 0,
    placeRate: Number(raw.placeRate) || 0,
    grade: raw.grade || "",
    stars: Number(raw.stars) || 0,
    entryStatus: status,
    entryStatusLabel: ENTRY_STATUS_LABEL[status],
    // 未確定（確定情報として利用しない）
    frame: null,
    jockey: null,
    weight: null,
    odds: null,
    popularity: null,
    _frameUnconfirmed: true,
    _jockeyUnconfirmed: true,
    _weightUnconfirmed: true,
    _oddsUnconfirmed: true,
    _removed: Boolean(raw._removed),
  };
}

function buildCareerFromRates(raw) {
  if (raw.careerRecord) return raw.careerRecord;
  const w = Number(raw.winRate) || 0;
  const p = Number(raw.placeRate) || 0;
  return `勝率${w}% / 複勝率${p}%`;
}

export function fingerprintEntries(entries = []) {
  return (entries || [])
    .map(
      (e) =>
        `${e.number}|${e.horseName || e.horse}|${e.entryStatus}|${e.age}|${e.sex}|${e.trainer}`
    )
    .sort()
    .join("\n");
}

export const EntryDataConnector = {
  connect: connectEntryData,
  fingerprint: fingerprintEntries,
  version: ENTRY_ENGINE_VERSION,
};
