/* ========================================
   PAPAPA IQ KEIBA - Base Intelligence Provider
   Ver5.2 Real Intelligence Connect
   ======================================== */

export const PROVIDER_STATUS = {
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
  READY: "READY",
  ERROR: "ERROR",
  DISABLED: "DISABLED",
};

/**
 * 情報源 Provider の共通契約
 */
export class BaseIntelligenceProvider {
  /**
   * @param {{
   *   id: string,
   *   label: string,
   *   priority?: number,
   *   enabled?: boolean,
   *   category?: string,
   *   implemented?: boolean
   * }} meta
   */
  constructor(meta) {
    this.id = meta.id;
    this.label = meta.label;
    this.priority = Number(meta.priority) || 100;
    this.enabled = meta.enabled !== false;
    this.category = meta.category || "site";
    this.implemented = meta.implemented !== false;
    this.status = this.enabled
      ? this.implemented
        ? PROVIDER_STATUS.READY
        : PROVIDER_STATUS.OFFLINE
      : PROVIDER_STATUS.DISABLED;
    this.lastUpdatedAt = null;
    this.lastCount = 0;
    this.lastError = null;
    this.lastResponseMs = 0;
    this.errorCount = 0;
    this.cacheKey = `papapa_iq_intel_${this.id}`;
  }

  getMeta() {
    return {
      id: this.id,
      label: this.label,
      priority: this.priority,
      enabled: this.enabled,
      category: this.category,
      implemented: this.implemented,
      status: this.status,
      lastUpdatedAt: this.lastUpdatedAt,
      lastCount: this.lastCount,
      lastError: this.lastError,
      lastResponseMs: this.lastResponseMs,
      errorCount: this.errorCount,
    };
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.status = PROVIDER_STATUS.DISABLED;
      return;
    }
    this.status = this.implemented
      ? PROVIDER_STATUS.READY
      : PROVIDER_STATUS.OFFLINE;
  }

  markError(err, responseMs = 0) {
    this.status = PROVIDER_STATUS.ERROR;
    this.lastError = err?.message || String(err);
    this.lastResponseMs = responseMs;
    this.errorCount += 1;
  }

  markSuccess(count, responseMs = 0) {
    this.lastCount = count;
    this.lastResponseMs = responseMs;
    this.lastUpdatedAt = new Date().toISOString();
    this.lastError = null;
    this.status =
      count > 0 ? PROVIDER_STATUS.ONLINE : PROVIDER_STATUS.READY;
  }

  /**
   * @returns {Promise<{ items: any[], fetchedAt: string, responseMs?: number, note?: string }>}
   */
  async fetch(_context = {}) {
    if (!this.enabled) {
      this.status = PROVIDER_STATUS.DISABLED;
      return { items: [], fetchedAt: null, responseMs: 0 };
    }

    if (!this.implemented) {
      this.status = PROVIDER_STATUS.OFFLINE;
      this.lastUpdatedAt = new Date().toISOString();
      this.lastCount = 0;
      return {
        items: [],
        fetchedAt: this.lastUpdatedAt,
        responseMs: 0,
        note: "not implemented (TODO)",
      };
    }

    this.status = PROVIDER_STATUS.READY;
    this.lastUpdatedAt = new Date().toISOString();
    this.lastCount = 0;
    this.lastError = null;
    return {
      items: [],
      fetchedAt: this.lastUpdatedAt,
      responseMs: 0,
      note: "stub",
    };
  }
}
