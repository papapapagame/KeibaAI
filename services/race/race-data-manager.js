/* ========================================
   RaceDataManager — Ver7.3
   AI向け唯一の Race/Horse 取得口
   RaceDataManager → Unified Model → AI
   ======================================== */

import { fetchRaceBundle } from "./race-repository.js";
import { mapRaceFromProvider } from "./race-mapper.js";
import { validateRace } from "./race-validator.js";
import { formatRaceSummary, formatRaceMeta } from "./race-formatter.js";
import { buildRaceDataStatus } from "./race-state-manager.js";
import {
  computeDataCompleteness,
  confidenceFromCompleteness,
} from "./data-completeness.js";
import { toLegacyHorse, toLegacyRace, UNIFIED_VERSION } from "../models/unified.js";
import { mapHorsesFromProvider } from "../horse/horse-mapper.js";
import { validateHorses } from "../horse/horse-validator.js";
import { enrichHorseHistory } from "../horse/horse-history-manager.js";
import { attachHorseConditions } from "../horse/horse-condition-manager.js";

export const RACE_DATA_VERSION = "7.3.0";

/**
 * AI用レース統合バンドル
 */
export async function loadRaceForAi(options = {}) {
  const repo = await fetchRaceBundle(options);
  if (!repo.ok || !repo.raw) {
    return {
      ok: false,
      blocked: Boolean(repo.blocked),
      message: repo.message || "Race data unavailable",
      providerId: repo.providerId,
      version: RACE_DATA_VERSION,
      unified: null,
      legacy: null,
      race: null,
      horses: [],
      dataStatus: null,
      completeness: null,
      validation: { ok: false, errors: [{ code: "FETCH", message: repo.message }], warnings: [] },
      mapping: { providerId: repo.providerId, status: "failed" },
    };
  }

  const providerId = repo.providerId || "mock";
  let horses = mapHorsesFromProvider(providerId, repo.raw.horses || []);
  horses = enrichHorseHistory(horses);
  horses = attachHorseConditions(horses);

  const horseValidation = validateHorses(horses);
  if (!horseValidation.ok) {
    // 異常馬は除外して続行（AIへ異常を渡さない）
    horses = horseValidation.sanitized || [];
  }

  const race = mapRaceFromProvider(providerId, repo.raw.race || {}, horses);
  if (options.stage != null) {
    race.analysisStage = { stage: Number(options.stage) || 0 };
  }

  const raceValidation = validateRace(race);
  if (!raceValidation.ok) {
    return {
      ok: false,
      blocked: false,
      message: raceValidation.errors.map((e) => e.message).join("; "),
      providerId,
      version: RACE_DATA_VERSION,
      unified: { race, horses },
      legacy: null,
      race: null,
      horses: [],
      dataStatus: buildRaceDataStatus(race, { stage: options.stage }),
      completeness: computeDataCompleteness(race, null),
      validation: raceValidation,
      mapping: { providerId, status: "mapped_invalid" },
    };
  }

  const dataStatus = buildRaceDataStatus(race, { stage: options.stage });
  const completeness = computeDataCompleteness(race, dataStatus);
  const legacyRace = toLegacyRace(race);
  const legacyHorses = horses.map(toLegacyHorse);

  return {
    ok: true,
    blocked: false,
    message: repo.message,
    providerId,
    version: RACE_DATA_VERSION,
    modelVersion: UNIFIED_VERSION,
    unified: { race, horses },
    legacy: {
      race: legacyRace,
      horses: legacyHorses,
      settings: repo.raw.settings || {},
    },
    race: legacyRace,
    horses: legacyHorses,
    settings: repo.raw.settings || {},
    dataStatus,
    completeness,
    validation: {
      ok: true,
      errors: [],
      warnings: [...(raceValidation.warnings || []), ...(horseValidation.warnings || [])],
    },
    mapping: {
      providerId,
      status: "ok",
      mappedAt: new Date().toISOString(),
    },
    summary: formatRaceSummary(race),
    meta: formatRaceMeta(race),
    count: {
      races: 1,
      horses: legacyHorses.length,
    },
    // 既存 analysis 互換
    status: {
      providerId,
      sourceLabel: `RaceDataManager / ${providerId}`,
      sourceMode: providerId === "mock" ? "mock" : providerId,
      fromCache: Boolean(repo.platform?.fromCache),
      updatedLabel: new Date().toLocaleString("ja-JP"),
      count: { races: 1, horses: legacyHorses.length },
      error: null,
      platformVersion: RACE_DATA_VERSION,
    },
    confidenceHint: confidenceFromCompleteness(
      options.baseConfidence ?? 72,
      completeness
    ),
  };
}

export const RaceDataManager = {
  loadForAi: loadRaceForAi,
  version: RACE_DATA_VERSION,
};
