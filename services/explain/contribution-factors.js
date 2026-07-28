/* ========================================
   Contribution Factors — Ver8.3
   ======================================== */

export const CONTRIBUTION_FACTOR = {
  ABILITY: "ability",
  RECENT_FORM: "recent_form",
  DISTANCE: "distance",
  COURSE: "course",
  TRACK: "track",
  FRAME: "frame",
  JOCKEY: "jockey",
  WEIGHT: "weight",
  ODDS: "odds",
  MARKET: "market",
  WEATHER: "weather",
  NEWS: "news",
  SOCIAL: "sns",
  LEARNING: "learning",
};

export const CONTRIBUTION_FACTOR_LABEL = {
  [CONTRIBUTION_FACTOR.ABILITY]: "能力評価",
  [CONTRIBUTION_FACTOR.RECENT_FORM]: "近走成績",
  [CONTRIBUTION_FACTOR.DISTANCE]: "距離適性",
  [CONTRIBUTION_FACTOR.COURSE]: "コース適性",
  [CONTRIBUTION_FACTOR.TRACK]: "馬場適性",
  [CONTRIBUTION_FACTOR.FRAME]: "枠順",
  [CONTRIBUTION_FACTOR.JOCKEY]: "騎手",
  [CONTRIBUTION_FACTOR.WEIGHT]: "斤量",
  [CONTRIBUTION_FACTOR.ODDS]: "オッズ",
  [CONTRIBUTION_FACTOR.MARKET]: "市場情報",
  [CONTRIBUTION_FACTOR.WEATHER]: "天候",
  [CONTRIBUTION_FACTOR.NEWS]: "ニュース",
  [CONTRIBUTION_FACTOR.SOCIAL]: "SNS",
  [CONTRIBUTION_FACTOR.LEARNING]: "Learning",
};

/** Evidence source → contribution factor mapping */
export const SOURCE_TO_FACTOR = {
  horse: CONTRIBUTION_FACTOR.ABILITY,
  race: CONTRIBUTION_FACTOR.COURSE,
  entry: CONTRIBUTION_FACTOR.ABILITY,
  draw: CONTRIBUTION_FACTOR.FRAME,
  odds: CONTRIBUTION_FACTOR.ODDS,
  weather: CONTRIBUTION_FACTOR.WEATHER,
  news: CONTRIBUTION_FACTOR.NEWS,
  social: CONTRIBUTION_FACTOR.SOCIAL,
  learning: CONTRIBUTION_FACTOR.LEARNING,
};

export const CLAIM_TO_FACTOR = {
  form_signal: CONTRIBUTION_FACTOR.RECENT_FORM,
  favorite_signal: CONTRIBUTION_FACTOR.ODDS,
  market_signal: CONTRIBUTION_FACTOR.MARKET,
  buzz_signal: CONTRIBUTION_FACTOR.SOCIAL,
  track_condition: CONTRIBUTION_FACTOR.TRACK,
  weather: CONTRIBUTION_FACTOR.WEATHER,
  stage_signal: CONTRIBUTION_FACTOR.FRAME,
  scratch_signal: CONTRIBUTION_FACTOR.NEWS,
  field_size: CONTRIBUTION_FACTOR.ABILITY,
  confidence_signal: CONTRIBUTION_FACTOR.LEARNING,
};

export const ALL_FACTORS = Object.values(CONTRIBUTION_FACTOR);
