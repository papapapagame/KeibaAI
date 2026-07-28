/* ========================================
   PAPAPA IQ KEIBA - services/horse API
   Ver7.3 Horse Data Engine
   ======================================== */

export {
  HorseManager,
  loadHorsesForAi,
  HORSE_DATA_VERSION,
} from "./horse-manager.js";

export { HorseRepository, fetchHorses } from "./horse-repository.js";
export { HorseMapper, mapHorseFromProvider, mapHorsesFromProvider } from "./horse-mapper.js";
export { HorseHistoryManager, enrichHorseHistory } from "./horse-history-manager.js";
export { HorseConditionManager, attachHorseConditions } from "./horse-condition-manager.js";
export { HorseValidator, validateHorses } from "./horse-validator.js";
