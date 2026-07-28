/* ========================================
   PAPAPA IQ KEIBA - services/providers/jra-provider.js
   Ver5.1 JRA Provider（未実装スタブ）
   ======================================== */

import { BaseProvider } from "./base-provider.js";

/**
 * TODO:
 * Implement JRA-VAN Provider
 * - JRA / JRA-VAN 系データソース接続
 * - 開催・レース・出馬表の正規化
 * - createHorseModel / createRaceModel へのマッピング
 */
export class JraProvider extends BaseProvider {
  constructor() {
    super("jra", "JRA");
  }

  async fetchBundle() {
    throw new Error(
      "[JraProvider] Not implemented yet. Switch DATA_PROVIDER back to dummy."
    );
  }
}
