/* ========================================
   HorseManager — Ver7.3
   ======================================== */

import { fetchHorses } from "./horse-repository.js";
import { mapHorsesFromProvider } from "./horse-mapper.js";
import { validateHorses } from "./horse-validator.js";
import { enrichHorseHistory } from "./horse-history-manager.js";
import { attachHorseConditions } from "./horse-condition-manager.js";
import { toLegacyHorse } from "../models/unified.js";

export const HORSE_DATA_VERSION = "7.3.0";

export async function loadHorsesForAi(options = {}) {
  const repo = await fetchHorses(options);
  if (!repo.ok) {
    return {
      ok: false,
      message: repo.message,
      horses: [],
      version: HORSE_DATA_VERSION,
    };
  }
  let horses = mapHorsesFromProvider(repo.providerId || "mock", repo.items);
  horses = enrichHorseHistory(horses);
  horses = attachHorseConditions(horses);
  const validation = validateHorses(horses);
  const list = validation.sanitized || [];
  return {
    ok: validation.ok || list.length > 0,
    message: repo.message,
    horses: list.map(toLegacyHorse),
    unified: list,
    validation,
    version: HORSE_DATA_VERSION,
    providerId: repo.providerId,
  };
}

export const HorseManager = {
  loadForAi: loadHorsesForAi,
  version: HORSE_DATA_VERSION,
};
