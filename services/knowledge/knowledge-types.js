/* ========================================
   Knowledge Graph Types — Ver8.4
   ======================================== */

export const NODE_TYPE = {
  HORSE: "Horse",
  RACE: "Race",
  JOCKEY: "Jockey",
  TRAINER: "Trainer",
  RACECOURSE: "Racecourse",
  ENTRY: "Entry",
  DRAW: "Draw",
  ODDS: "Odds",
  WEATHER: "Weather",
  TRACK: "Track",
  NEWS: "News",
  SOCIAL: "Social",
  EVIDENCE: "Evidence",
  DISCUSSION: "Discussion",
  REASON: "Reason",
  LEARNING: "Learning",
  PREDICTION: "Prediction",
  ANALYSIS_STAGE: "AnalysisStage",
  DISTANCE: "Distance",
  SURFACE: "Surface",
  CONFIDENCE: "Confidence",
};

export const NODE_TYPE_SET = new Set(Object.values(NODE_TYPE));

export const EDGE_TYPE = {
  HORSE_RACE: "Horse_Race",
  HORSE_JOCKEY: "Horse_Jockey",
  HORSE_TRAINER: "Horse_Trainer",
  HORSE_RACECOURSE: "Horse_Racecourse",
  HORSE_DISTANCE: "Horse_Distance",
  HORSE_SURFACE: "Horse_Surface",
  HORSE_WEATHER: "Horse_Weather",
  HORSE_ODDS: "Horse_Odds",
  HORSE_NEWS: "Horse_News",
  HORSE_SOCIAL: "Horse_Social",
  HORSE_EVIDENCE: "Horse_Evidence",
  HORSE_LEARNING: "Horse_Learning",
  RACE_WEATHER: "Race_Weather",
  RACE_TRACK: "Race_Track",
  RACE_ODDS: "Race_Odds",
  RACE_ENTRY: "Race_Entry",
  DISCUSSION_EVIDENCE: "Discussion_Evidence",
  REASON_EVIDENCE: "Reason_Evidence",
  PREDICTION_REASON: "Prediction_Reason",
  PREDICTION_CONFIDENCE: "Prediction_Confidence",
  RACE_STAGE: "Race_AnalysisStage",
  RACE_DISCUSSION: "Race_Discussion",
  RACE_PREDICTION: "Race_Prediction",
};

export const EDGE_TYPE_SET = new Set(Object.values(EDGE_TYPE));

export function nodeId(type, key) {
  return `${type}:${String(key || "").trim()}`;
}
