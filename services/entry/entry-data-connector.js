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
      message: fetched.userMessage || fetched.message || "Entry 取得失敗",
      userMessage: fetched.userMessage || fetched.message || "出馬表を取得できませんでした",
      providerId: fetched.providerId,
      mode: fetched.mode,
      entries: [],
      unified: [],
      validation: fetched.validation || {
        ok: false,
        errors: [{ code: "FETCH", message: fetched.message }],
        warnings: [],
      },
      version: ENTRY_ENGINE_VERSION,
    };
  }

  // Real は Provider 側で検証済。Mock は従来 Validator
  const validation =
    fetched.mode === "real" && fetched.validation?.ok
      ? fetched.validation
      : validateEntries(fetched.items || []);
  if (!validation.ok && fetched.mode !== "real") {
    return {
      ok: false,
      blocked: false,
      message: "Entry Validation failed",
      providerId: fetched.providerId,
      mode: fetched.mode,
      entries: [],
      unified: [],
      validation,
      version: ENTRY_ENGINE_VERSION,
    };
  }
  if (!validation.ok && fetched.mode === "real") {
    return {
      ok: false,
      blocked: false,
      message: "出馬表を取得できませんでした",
      userMessage: "出馬表を取得できませんでした",
      providerId: fetched.providerId,
      mode: "real",
      entries: [],
      unified: [],
      validation,
      version: ENTRY_ENGINE_VERSION,
    };
  }

  const keepConfirmed = fetched.mode === "real";
  const stage = Number(options.stage) || Number(fetched.meta?.defaultStage) || 0;
  const sourceItems =
    fetched.mode === "real"
      ? fetched.items || []
      : validation.sanitized || fetched.items || [];
  const entries = sourceItems.map((raw) =>
    toEntryRecord(raw, { keepConfirmed, stage })
  );
  const unified = entries.map((e) =>
    createHorseEntry({
      ...e,
      analysisStage: stage,
      frameConfirmed: keepConfirmed && stage >= 3,
      numberConfirmed: keepConfirmed && stage >= 3,
      jockeyConfirmed: keepConfirmed && stage >= 4,
      weightConfirmed: keepConfirmed && stage >= 5,
    })
  );

  return {
    ok: true,
    blocked: false,
    message: fetched.message || "Entry connected",
    providerId: fetched.providerId || "mock",
    mode: fetched.mode || "mock",
    entries,
    unified,
    validation: validation.ok
      ? validation
      : { ok: true, errors: [], warnings: validation.warnings || [] },
    meta: fetched.meta || {},
    count: entries.length,
    fetchedAt: fetched.meta?.updatedAt || new Date().toISOString(),
    version: ENTRY_ENGINE_VERSION,
    provenance: fetched.provenance || null,
    framework: fetched.framework || null,
    confirmation: fetched.meta?.confirmation || null,
    skipped: Boolean(fetched.meta?.skipped),
    changed: fetched.meta?.changed,
    fingerprint: fetched.meta?.fingerprint,
  };
}

export function toEntryRecord(raw = {}, options = {}) {
  const status = normalizeEntryStatus(raw.entryStatus);
  const keep = Boolean(options.keepConfirmed);
  const stage = Number(options.stage) || 0;
  const frameOk = keep && stage >= 3;
  const jockeyOk = keep && stage >= 4;
  const weightOk = keep && stage >= 5;

  const rawFrame = raw._rawFrame ?? raw.frame;
  const rawJockey =
    raw._rawJockey ??
    (typeof raw.jockey === "object" ? raw.jockey?.name : raw.jockey);
  const rawWeight = raw._rawWeight ?? raw.weight ?? raw.carriedWeight;

  return {
    horseId: raw.horseId || `H${String(raw.number).padStart(2, "0")}`,
    number: Number(raw.number) || 0,
    horseName: raw.horseName || raw.horse || raw.name || "",
    horse: raw.horseName || raw.horse || raw.name || "",
    sex: raw.sex || "",
    age: raw.age != null ? Number(raw.age) : null,
    affiliation: raw.affiliation || "",
    trainer:
      typeof raw.trainer === "object"
        ? raw.trainer?.name || ""
        : raw.trainer || raw.trainerName || "",
    trainerId: raw.trainerId || null,
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
    frame: frameOk ? rawFrame : null,
    jockey: jockeyOk ? rawJockey || null : null,
    jockeyId: raw.jockeyId || raw._rawJockeyId || null,
    weight: weightOk ? rawWeight : null,
    carriedWeight: raw.carriedWeight ?? rawWeight ?? null,
    odds: null,
    popularity: null,
    _frameUnconfirmed: !frameOk,
    _jockeyUnconfirmed: !jockeyOk,
    _weightUnconfirmed: !weightOk,
    _oddsUnconfirmed: true,
    _rawFrame: rawFrame,
    _rawJockey: rawJockey,
    _rawJockeyId: raw.jockeyId || raw._rawJockeyId || null,
    _rawWeight: rawWeight,
    _rawCarriedWeight: raw.carriedWeight ?? rawWeight,
    _removed: Boolean(raw._removed),
    _providerMode: keep ? "real" : "mock",
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
    .map((e) => {
      const j =
        typeof e.jockey === "object"
          ? e.jockey?.name || e._rawJockey
          : e.jockey || e._rawJockey || "";
      const w = e.weight ?? e._rawWeight ?? e.carriedWeight ?? "";
      const f = e.frame ?? e._rawFrame ?? "";
      return `${e.number}|${e.horseName || e.horse}|${e.entryStatus}|${e.age}|${e.sex}|${e.trainer}|${f}|${j}|${w}`;
    })
    .sort()
    .join("\n");
}

export const EntryDataConnector = {
  connect: connectEntryData,
  fingerprint: fingerprintEntries,
  version: ENTRY_ENGINE_VERSION,
};
