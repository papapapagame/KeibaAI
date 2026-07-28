/* ========================================
   PAPAPA IQ KEIBA - News Intelligence API
   Ver8.0
   ======================================== */

export {
  NewsManager,
  NEWS_ENGINE_VERSION,
  loadNewsForAi,
  mergeHorsesWithNews,
  getNewsDashboard,
  refreshNewsOnly,
} from "./news-manager.js";

export { NewsRepository, fetchNewsRaw } from "./news-repository.js";
export { NewsValidator, validateNewsItems } from "./news-validator.js";
export { NewsNormalizer, normalizeNewsItems } from "./news-normalizer.js";
export { NewsScoringEngine, scoreNewsItems } from "./news-scoring-engine.js";
export {
  NewsSynchronizer,
  syncNews,
  fingerprintNews,
  diffNews,
  loadNewsHistory,
  getNewsOverlay,
  clearNewsOverlay,
} from "./news-synchronizer.js";
export {
  NEWS_CATEGORY,
  NEWS_CATEGORY_LABEL,
  normalizeNewsCategory,
} from "./news-categories.js";
export {
  NewsMerge,
  NewsCompleteness,
  NewsFormatter,
  toAiNewsPayload,
  mergeNewsOntoHorses,
  applyNewsScoreAdjustments,
  computeNewsCompleteness,
  confidenceFromNewsCompleteness,
  formatNewsStagePanel,
} from "./news-merge.js";
