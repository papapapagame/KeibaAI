/* ========================================
   Evidence Sources — Ver8.2
   ======================================== */

export const EVIDENCE_SOURCE = {
  HORSE: "horse",
  RACE: "race",
  ENTRY: "entry",
  DRAW: "draw",
  ODDS: "odds",
  WEATHER: "weather",
  NEWS: "news",
  SOCIAL: "social",
  LEARNING: "learning",
};

export const EVIDENCE_SOURCE_LABEL = {
  [EVIDENCE_SOURCE.HORSE]: "Horse Intelligence",
  [EVIDENCE_SOURCE.RACE]: "Race Intelligence",
  [EVIDENCE_SOURCE.ENTRY]: "Entry Intelligence",
  [EVIDENCE_SOURCE.DRAW]: "Draw Intelligence",
  [EVIDENCE_SOURCE.ODDS]: "Odds Intelligence",
  [EVIDENCE_SOURCE.WEATHER]: "Weather Intelligence",
  [EVIDENCE_SOURCE.NEWS]: "News Intelligence",
  [EVIDENCE_SOURCE.SOCIAL]: "Social Intelligence",
  [EVIDENCE_SOURCE.LEARNING]: "Learning Engine",
};

export const EVIDENCE_SOURCE_SET = new Set(Object.values(EVIDENCE_SOURCE));

/** ソース優先ベース（矛盾解決の初期重み） */
export const SOURCE_BASE_WEIGHT = {
  [EVIDENCE_SOURCE.ENTRY]: 0.95,
  [EVIDENCE_SOURCE.DRAW]: 0.9,
  [EVIDENCE_SOURCE.ODDS]: 0.85,
  [EVIDENCE_SOURCE.WEATHER]: 0.8,
  [EVIDENCE_SOURCE.RACE]: 0.78,
  [EVIDENCE_SOURCE.HORSE]: 0.75,
  [EVIDENCE_SOURCE.NEWS]: 0.65,
  [EVIDENCE_SOURCE.SOCIAL]: 0.55,
  [EVIDENCE_SOURCE.LEARNING]: 0.7,
};

export const CLAIM_TYPE = {
  FIELD_SIZE: "field_size",
  TRACK_CONDITION: "track_condition",
  WEATHER: "weather",
  FAVORITE: "favorite_signal",
  SCRATCH: "scratch_signal",
  FORM: "form_signal",
  MARKET: "market_signal",
  BUZZ: "buzz_signal",
  STAGE: "stage_signal",
  CONFIDENCE: "confidence_signal",
};
