/* ========================================
   PAPAPA IQ KEIBA - config.js
   Ver2.0.0
   ======================================== */

export const APP_NAME = "PAPAPA IQ KEIBA";
export const VERSION = "3.0.0";
export const DEBUG = true;
export const DEFAULT_THEME = "dark";

/** ローカルJSON: "data/" / 本番API例: "https://api.example.com/v1/" */
export const API_BASE_URL = "data/";

export const LOADING_DURATION_MS = 1000;
export const PAGE_FADE_MS = 280;

export const MAX_HORSE = 18;
export const MAX_TICKET = 10;
export const DEFAULT_BET = 1000;
export const DEFAULT_RACE = 1;
export const DEFAULT_VENUE = "tokyo";

/** AIエンジン設定（将来 openai / gemini へ切替） */
export const AI_NAME = "PAPAPA IQ Engine";
export const AI_VERSION = "3.0.0-local";
export const AI_MODE = "local"; // local | openai | gemini
export const DEBUG_MODE = true;

/** 評価ウェイト（指数エンジン用） */
export const WEIGHT_SPEED = 1.0;
export const WEIGHT_TRACK = 1.0;
export const WEIGHT_DISTANCE = 1.0;
export const WEIGHT_JOCKEY = 0.8;
export const WEIGHT_VALUE = 1.2;

/** 指数システム（0〜999） */
export const INDEX_MAX = 999;
export const INDEX_BASE = 500;
export const INDEX_WEIGHT = {
  speed: 0.18,
  stability: 0.12,
  burst: 0.12,
  stamina: 0.12,
  pace: 0.14,
  aptitude: 0.14,
  expectedValue: 0.18,
};
export const INDEX_GAP_WIDE = 45;
export const INDEX_GAP_CLOSE = 18;

/**
 * AI思考エンジン重み（合計 1.0）
 * 能力→近走→展開→馬場→距離→コース→騎手→斤量→枠順→オッズ
 */
export const THINKING_WEIGHT = {
  ability: 0.3,
  recent: 0.15,
  pace: 0.2,
  track: 0.1,
  distance: 0.08,
  course: 0.05,
  jockey: 0.05,
  weight: 0.03,
  gate: 0.02,
  odds: 0.02,
};

/** 買い目戦略 */
export const TICKET_STRATEGIES = ["本命型", "バランス型", "高配当型"];
export const TICKET_BUDGETS = [1000, 3000, 5000, 10000];

/** 学習（低めの学習率で過学習抑制） */
export const LEARNING_RATE = 0.08;
export const LEARNING_STORAGE_KEY = "papapa_iq_learning_v2";
export const ROI_STORAGE_KEY = "papapa_iq_roi_v2";
export const THINKING_WEIGHT_STORAGE_KEY = "papapa_iq_thinking_weight_v2";
