/* ========================================
   HorseEntryNormalizer — Ver10.1
   → Unified Horse / Entry / Draw / Jockey / Trainer
   ======================================== */

import {
  createHorse,
  createHorseEntry,
  createJockey,
  createTrainer,
  createFrame,
  createWeight,
  createAnalysisStageRef,
  UNIFIED_VERSION,
} from "../../models/unified.js";
import { ENTRY_STATUS_LABEL } from "../../entry/entry-status.js";

export const HORSE_ENTRY_NORMALIZER_VERSION = "10.1.0";

/**
 * @param {object} parsed
 * @param {object} validation
 * @param {number} stage
 */
export function normalizeHorseEntries(parsed = {}, validation = {}, stage = 0) {
  const s = Number(stage) || Number(parsed.meta?.defaultStage) || 0;
  const frameConfirmed = s >= 3;
  const jockeyConfirmed = s >= 4;
  const weightConfirmed = s >= 5;
  const numberConfirmed = s >= 3;

  const source = validation.acceptedEntries || parsed.entries || [];

  const entries = source.map((raw) => {
    const jockey = createJockey({
      jockeyId: raw.jockeyId,
      name: raw.jockey,
      confirmed: jockeyConfirmed && Boolean(raw.jockey),
    });
    const trainer = createTrainer({
      trainerId: raw.trainerId,
      name: raw.trainer,
    });
    const frame = createFrame(frameConfirmed ? raw.frame : null);
    const weight = createWeight({
      kg: weightConfirmed ? raw.weight ?? raw.carriedWeight : null,
      confirmed: weightConfirmed && (raw.weight != null || raw.carriedWeight != null),
    });

    const horse = createHorse({
      ...raw,
      horseName: raw.horseName,
      jockey: jockeyConfirmed ? jockey : { name: "", confirmed: false },
      trainer,
      frame: frameConfirmed ? frame.frame : null,
      weight: weightConfirmed ? weight.kg : null,
      entryStatus: raw.entryStatus,
      entryStatusLabel: ENTRY_STATUS_LABEL[raw.entryStatus] || raw.entryStatus,
    });

    const entry = createHorseEntry({
      ...raw,
      ...horse,
      jockey: jockeyConfirmed ? jockey : null,
      trainer,
      frame: frameConfirmed ? raw.frame : null,
      weight: weightConfirmed ? raw.weight ?? raw.carriedWeight : null,
      carriedWeight: raw.carriedWeight ?? raw.weight,
      jockeyId: raw.jockeyId,
      trainerId: raw.trainerId,
      analysisStage: s,
      frameConfirmed,
      numberConfirmed,
      jockeyConfirmed,
      weightConfirmed,
      oddsConfirmed: false,
      // keep raw values for stage reveal
      _rawFrame: raw.frame,
      _rawJockey: raw.jockey,
      _rawJockeyId: raw.jockeyId,
      _rawWeight: raw.weight ?? raw.carriedWeight,
      _rawCarriedWeight: raw.carriedWeight ?? raw.weight,
    });

    return {
      ...entry,
      // connector 互換の平坦フィールド
      jockey: jockeyConfirmed ? raw.jockey : null,
      jockeyId: raw.jockeyId || null,
      trainer: raw.trainer || "",
      trainerId: raw.trainerId || null,
      frame: frameConfirmed ? raw.frame : null,
      weight: weightConfirmed ? raw.weight ?? raw.carriedWeight : null,
      carriedWeight: raw.carriedWeight ?? raw.weight,
      number: numberConfirmed || s >= 2 ? raw.number : raw.number,
      _frameUnconfirmed: !frameConfirmed,
      _jockeyUnconfirmed: !jockeyConfirmed,
      _weightUnconfirmed: !weightConfirmed,
      _numberUnconfirmed: !numberConfirmed,
      _oddsUnconfirmed: true,
      _rawFrame: raw.frame,
      _rawJockey: raw.jockey,
      _rawJockeyId: raw.jockeyId,
      _rawWeight: raw.weight ?? raw.carriedWeight,
      _rawCarriedWeight: raw.carriedWeight ?? raw.weight,
    };
  });

  const horses = entries.map((e) =>
    createHorse({
      ...e,
      jockey: e._rawJockey,
      jockeyId: e._rawJockeyId,
      frame: e._rawFrame,
      weight: e._rawWeight,
    })
  );

  const draws = entries
    .filter((e) => e._rawFrame != null)
    .map((e) => ({
      modelVersion: UNIFIED_VERSION,
      kind: "Draw",
      horseId: e.horseId,
      number: e.number,
      frame: e._rawFrame,
      confirmed: frameConfirmed,
      analysisStage: createAnalysisStageRef(s),
    }));

  const jockeys = uniqueBy(
    entries
      .filter((e) => e._rawJockey)
      .map((e) =>
        createJockey({
          jockeyId: e._rawJockeyId,
          name: e._rawJockey,
          confirmed: jockeyConfirmed,
        })
      ),
    (j) => j.jockeyId || j.name
  );

  const trainers = uniqueBy(
    entries
      .filter((e) => e.trainer)
      .map((e) =>
        createTrainer({
          trainerId: e.trainerId,
          name: typeof e.trainer === "object" ? e.trainer.name : e.trainer,
        })
      ),
    (t) => t.trainerId || t.name
  );

  return {
    modelVersion: UNIFIED_VERSION,
    normalizerVersion: HORSE_ENTRY_NORMALIZER_VERSION,
    providerId: parsed.providerId || "real-horse",
    stage: s,
    entries,
    horses,
    draws,
    jockeys,
    trainers,
    meta: parsed.meta || {},
    normalizedAt: new Date().toISOString(),
    confirmation: {
      frameConfirmed,
      jockeyConfirmed,
      weightConfirmed,
      numberConfirmed,
    },
  };
}

function uniqueBy(list, keyFn) {
  const map = new Map();
  for (const item of list) {
    const k = keyFn(item);
    if (!k || map.has(k)) continue;
    map.set(k, item);
  }
  return [...map.values()];
}

export const HorseEntryNormalizer = {
  normalize: normalizeHorseEntries,
  version: HORSE_ENTRY_NORMALIZER_VERSION,
};
