/* ========================================
   PAPAPA IQ KEIBA - services/providers/csv-provider.js
   Ver5.1 CSV Provider（未実装スタブ）
   ======================================== */

import { BaseProvider } from "./base-provider.js";

/**
 * TODO:
 * Implement CSV Provider
 * - CSV / TSV からの開催・出馬表読込
 * - 文字コード・区切り文字の設定
 * - createHorseModel / createRaceModel へのマッピング
 */
export class CsvProvider extends BaseProvider {
  constructor() {
    super("csv", "CSV");
  }

  async fetchBundle() {
    throw new Error(
      "[CsvProvider] Not implemented yet. Switch DATA_PROVIDER back to dummy."
    );
  }
}
