/* ========================================
   Provider Interface — Ver7.4
   全 Provider が実装する共通口
   ======================================== */

export const PROVIDER_HEALTH = {
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
  ERROR: "ERROR",
  WAITING: "WAITING",
  UNKNOWN: "UNKNOWN",
};

export const PROVIDER_DATA_KINDS = [
  "Race",
  "Horse",
  "Jockey",
  "Trainer",
  "Odds",
  "Weather",
  "TrackCondition",
  "News",
  "Review",
  "Market",
];

export const PROVIDER_VERSION = "7.4.0";

/**
 * 全 Provider の同一 Interface
 * Real Provider は接続口のみ（未接続は notConnected）
 */
export class ProviderInterface {
  constructor(meta = {}) {
    this.id = meta.id || "unknown";
    this.label = meta.label || this.id;
    this.kind = meta.kind || "general";
    this.enabled = meta.enabled !== false;
    this.implemented = Boolean(meta.implemented);
    this.priority = Number(meta.priority) || 100;
    this.version = meta.version || PROVIDER_VERSION;
    this._health = meta.health || PROVIDER_HEALTH.UNKNOWN;
  }

  async fetchRace(_options = {}) {
    return this.notConnected("fetchRace");
  }

  async fetchHorse(_options = {}) {
    return this.notConnected("fetchHorse");
  }

  async fetchHorses(_options = {}) {
    return this.notConnected("fetchHorses");
  }

  async fetchJockey(_options = {}) {
    return this.notConnected("fetchJockey");
  }

  async fetchTrainer(_options = {}) {
    return this.notConnected("fetchTrainer");
  }

  async fetchOdds(_options = {}) {
    return this.notConnected("fetchOdds");
  }

  async fetchWeather(_options = {}) {
    return this.notConnected("fetchWeather");
  }

  async fetchTrackCondition(_options = {}) {
    return this.notConnected("fetchTrackCondition");
  }

  async fetchNews(_options = {}) {
    return this.notConnected("fetchNews");
  }

  async fetchReview(_options = {}) {
    return this.notConnected("fetchReview");
  }

  async fetchMarket(_options = {}) {
    return this.notConnected("fetchMarket");
  }

  /** 分析用バンドル（Race + Horse + settings） */
  async fetchBundle(options = {}) {
    return this.notConnected("fetchBundle");
  }

  async ping() {
    if (!this.implemented) {
      this._health = PROVIDER_HEALTH.OFFLINE;
      return { ok: false, health: this._health, note: "Provider未接続" };
    }
    this._health = PROVIDER_HEALTH.ONLINE;
    return { ok: true, health: this._health };
  }

  notConnected(method) {
    const error = new Error(`Provider未接続: ${this.id}.${method}`);
    error.code = "PROVIDER_NOT_CONNECTED";
    error.providerId = this.id;
    this._health = PROVIDER_HEALTH.OFFLINE;
    throw error;
  }

  getHealth() {
    if (!this.enabled) return PROVIDER_HEALTH.OFFLINE;
    if (!this.implemented) return PROVIDER_HEALTH.OFFLINE;
    return this._health || PROVIDER_HEALTH.UNKNOWN;
  }

  setHealth(health) {
    this._health = health;
  }

  getMeta() {
    return {
      id: this.id,
      label: this.label,
      kind: this.kind,
      enabled: this.enabled,
      implemented: this.implemented,
      priority: this.priority,
      version: this.version,
      health: this.getHealth(),
      note: this.implemented
        ? null
        : "Provider未接続（接続口のみ）",
    };
  }
}
