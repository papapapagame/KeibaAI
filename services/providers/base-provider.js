/* ========================================
   PAPAPA IQ KEIBA - services/providers/base-provider.js
   Ver5.1 Provider インターフェース
   ======================================== */

/**
 * すべての Provider が実装すべき契約
 * fetchBundle() => { races, horses, settings, fetchedAt }
 */
export class BaseProvider {
  constructor(id, label) {
    this.id = id;
    this.label = label;
  }

  async fetchBundle(_options = {}) {
    throw new Error(`[${this.id}] fetchBundle() is not implemented`);
  }

  getMeta() {
    return { id: this.id, label: this.label };
  }
}
