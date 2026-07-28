/* ========================================
   PAPAPA IQ KEIBA - services/providers/api-provider.js
   Ver5.1 API Provider（未実装スタブ）
   ======================================== */

import { BaseProvider } from "./base-provider.js";

/**
 * TODO:
 * Implement API Provider
 * - 外部 REST API からの開催・出馬表取得
 * - 認証ヘッダ / レート制限
 * - createHorseModel / createRaceModel へのマッピング
 */
export class ApiProvider extends BaseProvider {
  constructor() {
    super("api", "API");
  }

  async fetchBundle() {
    throw new Error(
      "[ApiProvider] Not implemented yet. Switch DATA_PROVIDER back to dummy."
    );
  }
}
