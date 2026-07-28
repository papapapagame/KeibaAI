/* ========================================
   PAPAPA IQ KEIBA - Social Intelligence API
   Ver8.1
   ======================================== */

export {
  SocialManager,
  SOCIAL_ENGINE_VERSION,
  loadSocialForAi,
  mergeHorsesWithSocial,
  applySocialScoreAdjustments,
  getSocialDashboard,
  refreshSocialOnly,
} from "./social-manager.js";

export { SocialRepository, fetchSocialRaw } from "./social-repository.js";
export { SocialValidator, validateSocialItems } from "./social-validator.js";
export { SocialNormalizer, normalizeSocialItems } from "./social-normalizer.js";
export {
  SocialScoringEngine,
  scoreSocialItem,
  scoreSocialItems,
} from "./social-scoring-engine.js";
export { TrendAnalyzer, analyzeTrends } from "./trend-analyzer.js";
export {
  SocialSynchronizer,
  syncSocialOverlay,
  fingerprintSocial,
  diffSocial,
  loadSocialHistory,
  getSocialOverlay,
  clearSocialOverlay,
} from "./social-synchronizer.js";
export {
  SOCIAL_CATEGORY,
  SOCIAL_CATEGORY_LABEL,
  normalizeSocialCategory,
} from "./social-categories.js";
export {
  SocialMerge,
  SocialCompleteness,
  SocialFormatter,
  toAiSocialPayload,
  mergeSocialOntoHorses,
  applySocialScoreAdjustments as applySocialScores,
  computeSocialCompleteness,
  confidenceFromSocialCompleteness,
  formatSocialStagePanel,
} from "./social-merge.js";

export {
  getSocialMode,
  setSocialMode,
  SOCIAL_MODE_KEY,
  SOCIAL_MODES,
  SocialMode,
} from "./social-mode.js";
