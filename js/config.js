/* ========================================
   PAPAPA IQ KEIBA - config.js
   Ver10.9.0 Low-Risk Public Intelligence
   ======================================== */

export const APP_NAME = "PAPAPA IQ KEIBA";
export const VERSION = "10.9.1";
export const RELEASE_CHANNEL = "Past Race Report";
export const BUILD_DATE = "2026-07-29";
export const BUILD_NUMBER = "20260729.1091";
export const IS_RELEASE_CANDIDATE = false;

export const DEBUG = true;
export const DEFAULT_THEME = "dark";

/** GitHub Pages 同一オリジン相対 */
export const API_BASE_URL = "data/";

/** GitHub Raw（公開リポジトリ） */
export const GITHUB_OWNER = "papapapagame";
export const GITHUB_REPO = "KeibaAI";
export const GITHUB_BRANCH = "main";
export const GITHUB_RAW_BASE_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/`;

/**
 * 空文字 = GitHub Pages 相対 data/ を優先
 * 絶対URLを入れるとそれを優先
 */
export const REAL_DATA_BASE_URL = "";
/** true の場合 raw.githubusercontent.com を優先 */
export const PREFER_GITHUB_RAW = false;

export const LIVE_HTTP_TIMEOUT_MS = 20000;
export const LIVE_DATA_ENABLED = true;

/** Real Race — GitHub /data/calendar/calendar.json */
export const REAL_RACE_CALENDAR_URL = "data/calendar/calendar.json";
export const REAL_RACE_FETCH_TIMEOUT_MS = 15000;
export const REAL_RACE_PROVIDER_VERSION = "10.8.1";

/** Real Horse — GitHub /data/horse/entries.json */
export const REAL_HORSE_ENTRY_URL = "data/horse/entries.json";
export const REAL_HORSE_FETCH_TIMEOUT_MS = 15000;
export const REAL_HORSE_PROVIDER_VERSION = "10.8.1";
export const ENTRY_MODE_KEY = "papapa_iq_entry_mode_v1081";

/** Real Odds — GitHub /data/odds/odds.json */
export const REAL_ODDS_URL = "data/odds/odds.json";
export const REAL_ODDS_FETCH_TIMEOUT_MS = 15000;
export const REAL_ODDS_PROVIDER_VERSION = "10.8.1";
export const ODDS_MODE_KEY = "papapa_iq_odds_mode_v1081";

/** Real Weather — Open-Meteo JMA（失敗時 Forecast） */
export const REAL_WEATHER_URL = "https://api.open-meteo.com/v1/jma";
export const REAL_WEATHER_FETCH_TIMEOUT_MS = 15000;
export const REAL_WEATHER_PROVIDER_VERSION = "10.9.0";
export const WEATHER_MODE_KEY = "papapa_iq_weather_mode_v1081";

/** Real News — Google News RSS（レース横断 + YouTube言及メタ） */
export const REAL_NEWS_URL =
  "https://news.google.com/rss/search?q=%E7%AB%B6%E9%A6%AC&hl=ja&gl=JP&ceid=JP:ja";
export const REAL_NEWS_GITHUB_URL = "data/news/news.json";
export const REAL_NEWS_FETCH_TIMEOUT_MS = 15000;
export const REAL_NEWS_PROVIDER_VERSION = "10.9.0";
export const NEWS_MODE_KEY = "papapa_iq_news_mode_v1081";

/** Real Social — Wikipedia pageviews（会場・馬別）+ HN */
export const REAL_SOCIAL_URL =
  "https://wikimedia.org/api/rest_v1/metrics/pageviews";
export const REAL_SOCIAL_GITHUB_URL = "data/social/social.json";
export const REAL_SOCIAL_FETCH_TIMEOUT_MS = 25000;
export const REAL_SOCIAL_PROVIDER_VERSION = "10.9.0";
export const SOCIAL_MODE_KEY = "papapa_iq_social_mode_v1081";

export const DATA_PROVIDER = "real";

export const DATA_CACHE_TTL_MS = 10 * 60 * 1000;
export const INTEL_CACHE_TTL_MS = DATA_CACHE_TTL_MS;
export const PREFETCH_DEDUP_TTL_MS = 60 * 1000;
export const UPDATE_EVENT_DEDUP_MS = 2000;

export const LEARNING_AI_VERSION = "5.5.0";
export const LEARNING_AI_DB_KEY = "papapa_iq_learning_ai_v55";
export const REVIEW_AI_VERSION = "6.5.0";
export const REVIEW_KB_KEY = "papapa_iq_review_kb_v65";
export const DATA_PLATFORM_VERSION = "7.0.0";
export const DATA_SOURCE_MODE_KEY = "papapa_iq_data_source_mode_v1081";
export const CALENDAR_VERSION = "7.1.0";
export const CALENDAR_MODE_KEY = "papapa_iq_calendar_mode_v1081";
export const UPDATE_ENGINE_VERSION = "7.2.0";
export const UPDATE_HISTORY_KEY = "papapa_iq_update_history_v72";
export const UPDATE_STATE_KEY = "papapa_iq_update_state_v72";
export const RACE_HORSE_VERSION = "7.3.0";
export const PROVIDER_FRAMEWORK_VERSION = "7.4.0";
export const RACE_CONNECT_VERSION = "7.5.0";
export const ENTRY_ENGINE_VERSION = "7.6.0";
export const DRAW_ENGINE_VERSION = "7.7.0";
export const ODDS_ENGINE_VERSION = "7.8.0";
export const WEATHER_ENGINE_VERSION = "7.9.0";
export const NEWS_ENGINE_VERSION = "8.0.0";
export const SOCIAL_ENGINE_VERSION = "8.1.0";
export const DISCUSSION_ENGINE_VERSION = "8.2.0";
export const EXPLAIN_ENGINE_VERSION = "8.3.0";
export const KNOWLEDGE_GRAPH_VERSION = "8.4.0";

export const REAL_RACE_CALENDAR_VERSION = "10.8.1";
export const REAL_HORSE_ENTRY_VERSION = "10.8.1";
export const REAL_ODDS_VERSION = "10.8.1";
export const REAL_WEATHER_VERSION = "10.9.0";
export const REAL_NEWS_VERSION = "10.9.0";
export const REAL_SOCIAL_VERSION = "10.9.0";
export const PRODUCTION_INTEGRATION_VERSION = "10.9.0";
export const LIVE_REAL_DATA_VERSION = "10.9.0";

export const LOADING_DURATION_MS = 1000;
export const PAGE_FADE_MS = 280;

export const MAX_HORSE = 18;
export const MAX_TICKET = 10;
export const DEFAULT_BET = 1000;
export const DEFAULT_RACE = 1;
export const DEFAULT_VENUE = "tokyo";

export const AI_NAME = "PAPAPA IQ Engine";
export const AI_VERSION = "3.0.0-local";
export const AI_MODE = "local";
export const DEBUG_MODE = true;

export const WEIGHT_SPEED = 1.0;
export const WEIGHT_TRACK = 1.0;
export const WEIGHT_DISTANCE = 1.0;
export const WEIGHT_JOCKEY = 0.8;
export const WEIGHT_VALUE = 1.2;

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

export const TICKET_STRATEGIES = ["本命型", "バランス型", "高配当型"];
export const TICKET_BUDGETS = [1000, 3000, 5000, 10000];

export const LEARNING_RATE = 0.08;
export const LEARNING_STORAGE_KEY = "papapa_iq_learning_v2";
export const ROI_STORAGE_KEY = "papapa_iq_roi_v2";
export const THINKING_WEIGHT_STORAGE_KEY = "papapa_iq_thinking_weight_v2";

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
