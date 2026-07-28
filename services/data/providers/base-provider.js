/* ========================================
   Base Data Provider — Ver7.0
   ======================================== */

export const PROVIDER_STATUS = {
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
  ERROR: "ERROR",
  NOT_CONNECTED: "NOT_CONNECTED",
};

/**
 * 全 Provider の共通インターフェース
 * fetch* はサブクラスで実装。未実装は NOT_CONNECTED。
 */
export class BaseDataProvider {
  constructor(meta = {}) {
    this.id = meta.id || "unknown";
    this.label = meta.label || this.id;
    this.kind = meta.kind || "race";
    this.implemented = Boolean(meta.implemented);
    this.priority = Number(meta.priority) || 100;
  }

  async fetchRaces(_options = {}) {
    return this.notConnected("fetchRaces");
  }

  async fetchRace(_options = {}) {
    return this.notConnected("fetchRace");
  }

  async fetchHorses(_options = {}) {
    return this.notConnected("fetchHorses");
  }

  async fetchOdds(_options = {}) {
    return this.notConnected("fetchOdds");
  }

  async fetchNews(_options = {}) {
    return this.notConnected("fetchNews");
  }

  async fetchMarket(_options = {}) {
    return this.notConnected("fetchMarket");
  }

  /** 分析用バンドル（race + horses + settings） */
  async fetchBundle(options = {}) {
    return this.notConnected("fetchBundle");
  }

  notConnected(method) {
    const error = new Error(`Provider未接続: ${this.id}.${method}`);
    error.code = "PROVIDER_NOT_CONNECTED";
    error.providerId = this.id;
    throw error;
  }

  getMeta() {
    return {
      id: this.id,
      label: this.label,
      kind: this.kind,
      implemented: this.implemented,
      priority: this.priority,
      status: this.implemented ? PROVIDER_STATUS.ONLINE : PROVIDER_STATUS.NOT_CONNECTED,
    };
  }
}
