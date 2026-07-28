/* ========================================
   PAPAPA IQ KEIBA - config.js
   Ver10.3.0 Real Weather
   ======================================== */

export const APP_NAME = "PAPAPA IQ KEIBA";
export const VERSION = "10.3.0";
export const RELEASE_CHANNEL = "Real Weather";
export const BUILD_DATE = "2026-07-28";
export const BUILD_NUMBER = "20260728.103";
export const IS_RELEASE_CANDIDATE = false;

export const DEBUG = true;
export const DEFAULT_THEME = "dark";

/** ローカルJSON: "data/" / 本番API例: "https://api.example.com/v1/" */
export const API_BASE_URL = "data/";

/**
 * Real Race Calendar 取得先（GitHub Pages 対応）
 * 外部 API へ差し替える場合は絶対 URL を設定
 */
export const REAL_RACE_CALENDAR_URL = "data/calendar/real-calendar.json";
export const REAL_RACE_FETCH_TIMEOUT_MS = 12000;
export const REAL_RACE_PROVIDER_VERSION = "10.0.0";

/**
 * Real Horse Entry 取得先（GitHub Pages 対応）
 */
export const REAL_HORSE_ENTRY_URL = "data/entry/real-entries.json";
export const REAL_HORSE_FETCH_TIMEOUT_MS = 12000;
export const REAL_HORSE_PROVIDER_VERSION = "10.1.0";
export const ENTRY_MODE_KEY = "papapa_iq_entry_mode_v101";

/**
 * Real Odds 取得先（GitHub Pages 対応）
 */
export const REAL_ODDS_URL = "data/odds/real-odds.json";
export const REAL_ODDS_FETCH_TIMEOUT_MS = 12000;
export const REAL_ODDS_PROVIDER_VERSION = "10.2.0";
export const ODDS_MODE_KEY = "papapa_iq_odds_mode_v102";

/**
 * Real Weather 取得先（GitHub Pages 対応）
 */
export const REAL_WEATHER_URL = "data/weather/real-weather.json";
export const REAL_WEATHER_FETCH_TIMEOUT_MS = 12000;
export const REAL_WEATHER_PROVIDER_VERSION = "10.3.0";
export const WEATHER_MODE_KEY = "papapa_iq_weather_mode_v103";

/**
 * データ取得 Provider 切替（レガシー Ver5.1）
 * dummy | csv | api | jra
 * Ver7.0 以降は services/data の Source Mode (mock|real|auto) を優先
 */
export const DATA_PROVIDER = "dummy";

/** Intelligence Cache TTL（ms）— Ver5.2 差分更新と併用 */
export const DATA_CACHE_TTL_MS = 10 * 60 * 1000;
export const INTEL_CACHE_TTL_MS = DATA_CACHE_TTL_MS;

/** Prefetch 重複防止 TTL（ms）— Ver9.0 */
export const PREFETCH_DEDUP_TTL_MS = 60 * 1000;

/** Smart Update 同一イベント抑制窓（ms）— Ver9.0 */
export const UPDATE_EVENT_DEDUP_MS = 2000;

/** Learning AI Engine（services/learning） */
export const LEARNING_AI_VERSION = "5.5.0";
export const LEARNING_AI_DB_KEY = "papapa_iq_learning_ai_v55";

/** Race Review Knowledge Base（services/review） */
export const REVIEW_AI_VERSION = "6.5.0";
export const REVIEW_KB_KEY = "papapa_iq_review_kb_v65";

/** Real Data Platform（services/data） */
export const DATA_PLATFORM_VERSION = "7.0.0";
export const DATA_SOURCE_MODE_KEY = "papapa_iq_data_source_mode_v70";

/** Race Calendar Intelligence（services/calendar） */
export const CALENDAR_VERSION = "7.1.0";
export const CALENDAR_MODE_KEY = "papapa_iq_calendar_mode_v71";

/** Smart Update Engine（services/update） */
export const UPDATE_ENGINE_VERSION = "7.2.0";
export const UPDATE_HISTORY_KEY = "papapa_iq_update_history_v72";
export const UPDATE_STATE_KEY = "papapa_iq_update_state_v72";

/** Race & Horse Data Integration（services/race, services/horse） */
export const RACE_HORSE_VERSION = "7.3.0";

/** Provider Integration Framework（services/provider） */
export const PROVIDER_FRAMEWORK_VERSION = "7.4.0";

/** Race Data Connect（services/race-connect） */
export const RACE_CONNECT_VERSION = "7.5.0";

/** Horse Entry Intelligence（services/entry） */
export const ENTRY_ENGINE_VERSION = "7.6.0";

/** Draw & Jockey Intelligence（services/draw） */
export const DRAW_ENGINE_VERSION = "7.7.0";

/** Odds & Market Intelligence（services/odds） */
export const ODDS_ENGINE_VERSION = "7.8.0";

/** Weather & Track Intelligence（services/weather） */
export const WEATHER_ENGINE_VERSION = "7.9.0";

/** News Intelligence（services/news） */
export const NEWS_ENGINE_VERSION = "8.0.0";

/** Social Intelligence（services/social） */
export const SOCIAL_ENGINE_VERSION = "8.1.0";

/** AI Discussion Engine（services/discussion） */
export const DISCUSSION_ENGINE_VERSION = "8.2.0";

/** Prediction Explainability（services/explain） */
export const EXPLAIN_ENGINE_VERSION = "8.3.0";

/** Knowledge Graph（services/knowledge） */
export const KNOWLEDGE_GRAPH_VERSION = "8.4.0";

/** Real Race Calendar（services/provider/race） */
export const REAL_RACE_CALENDAR_VERSION = "10.0.0";

/** Real Horse Entry（services/provider/horse） */
export const REAL_HORSE_ENTRY_VERSION = "10.1.0";

/** Real Odds（services/provider/odds） */
export const REAL_ODDS_VERSION = "10.2.0";

/** Real Weather（services/provider/weather） */
export const REAL_WEATHER_VERSION = "10.3.0";

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

/** リリース表示用 */
export function getReleaseLabel() {
  return `${APP_NAME} Ver${VERSION} ${RELEASE_CHANNEL}`;
}

export function getBuildInfo() {
  return {
    version: VERSION,
    channel: RELEASE_CHANNEL,
    buildDate: BUILD_DATE,
    buildNumber: BUILD_NUMBER,
    isRc: IS_RELEASE_CANDIDATE,
  };
}
