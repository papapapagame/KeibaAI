/* ========================================
   Stub Providers — Ver7.0（インターフェースのみ）
   ======================================== */

import { BaseDataProvider, PROVIDER_STATUS } from "./base-provider.js";

function stub(id, label, kind, priority) {
  return class extends BaseDataProvider {
    constructor() {
      super({ id, label, kind, implemented: false, priority });
    }

    getMeta() {
      return {
        ...super.getMeta(),
        status: PROVIDER_STATUS.NOT_CONNECTED,
        note: "Provider未接続（インターフェースのみ）",
      };
    }
  };
}

export const JraProvider = stub("jra", "JRA Provider", "official", 10);
export const NetkeibaProvider = stub("netkeiba", "netkeiba Provider", "race", 20);
export const JbisProvider = stub("jbis", "JBIS Provider", "pedigree", 30);
export const KeibalabProvider = stub("keibalab", "KeibaLab Provider", "analysis", 40);
export const MarketProvider = stub("market", "Market Provider", "odds", 50);
export const NewsProvider = stub("news", "News Provider", "news", 60);
export const SocialProvider = stub("social", "Social (X) Provider", "social", 70);
