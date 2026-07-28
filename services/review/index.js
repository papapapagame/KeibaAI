/* ========================================
   PAPAPA IQ KEIBA - services/review API
   Ver6.5 AI Race Review & Knowledge Learning
   ======================================== */

export {
  runRaceReview,
  RaceReviewEngine,
  WinnerAnalyzer,
  LoserAnalyzer,
  RaceFlowAnalyzer,
  LessonGenerator,
  FuturePredictionManager,
  KnowledgeManager,
  ExplainReview,
  REVIEW_VERSION,
} from "./race-review-engine.js";

export {
  analyzeWinner,
} from "./winner-analyzer.js";

export {
  analyzeLosers,
} from "./loser-analyzer.js";

export {
  analyzeRaceFlow,
} from "./race-flow-analyzer.js";

export {
  generateLessons,
} from "./lesson-generator.js";

export {
  buildFutureWatch,
} from "./future-prediction-manager.js";

export {
  loadKnowledgeBase,
  saveKnowledgeBase,
  clearKnowledgeBase,
  createKnowledgeRecord,
  appendHorseMemo,
  getKnowledgeStats,
  REVIEW_DB_KEY,
} from "./knowledge-manager.js";

export {
  explainReview,
} from "./explain-review.js";

export {
  loadReviewSources,
  integrateSources,
} from "./review-sources.js";

export {
  buildLearningHandoff,
  toLearningCompatibleNotes,
} from "./learning-bridge.js";

export {
  getReviewDashboard,
  resetReviewKnowledge,
  reviewFromHistoryRecord,
  bootstrapReviewsFromHistory,
} from "./review-dashboard.js";

export {
  buildPastRaceReport,
  findPastRaceRecord,
  loadPastRaceCatalog,
  isPastRaceDate,
  PastRaceReport,
  PAST_RACE_REPORT_VERSION,
} from "./past-race-report.js";

export { buildHorseMemos } from "./horse-memo.js";
export { ensureDemoReviewData } from "./seed-demo.js";
