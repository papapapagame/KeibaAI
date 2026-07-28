/* ========================================
   PAPAPA IQ KEIBA - services/learning API
   Ver5.5 Learning AI Engine
   ======================================== */

export {
  recordPrediction,
  learnFromResult,
  ingestClosedRace,
  getLearningDashboard,
  updateAnalyzerWeights,
  resetAnalyzerWeights,
  resetLearningAiData,
  acceptReviewHandoff,
  loadWeights,
  proposeWeights,
  analyzePerformance,
  trackAnalyzerAccuracy,
  LEARNING_VERSION,
} from "./learning-engine.js";

export {
  loadLearningDatabase,
  saveLearningDatabase,
  clearLearningDatabase,
  createLearningRecord,
  LEARNING_DB_KEY,
} from "./learning-db.js";

export { analyzeRaceResult } from "./result-analyzer.js";
export { explainLearning } from "./explain-learning.js";
