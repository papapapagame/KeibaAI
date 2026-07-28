/* ========================================
   Stub Providers — Ver7.4（接続口のみ）
   ======================================== */

import {
  ProviderInterface,
  PROVIDER_HEALTH,
  PROVIDER_VERSION,
} from "../provider-interface.js";

function createStub({ id, label, kind, priority }) {
  return class extends ProviderInterface {
    constructor() {
      super({
        id,
        label,
        kind,
        enabled: false,
        implemented: false,
        priority,
        version: PROVIDER_VERSION,
        health: PROVIDER_HEALTH.OFFLINE,
      });
    }

    async ping() {
      this.setHealth(PROVIDER_HEALTH.OFFLINE);
      return {
        ok: false,
        health: PROVIDER_HEALTH.OFFLINE,
        note: "Provider未接続（接続口のみ）",
      };
    }

    getMeta() {
      return {
        ...super.getMeta(),
        health: PROVIDER_HEALTH.OFFLINE,
        note: "Provider未接続（接続口のみ）",
      };
    }
  };
}

export const JraProvider = createStub({
  id: "jra",
  label: "JRA",
  kind: "official",
  priority: 10,
});

export const JbisProvider = createStub({
  id: "jbis",
  label: "JBIS",
  kind: "pedigree",
  priority: 20,
});

export const NetkeibaProvider = createStub({
  id: "netkeiba",
  label: "netkeiba",
  kind: "race",
  priority: 30,
});

export const KeibaLabProvider = createStub({
  id: "keibalab",
  label: "KeibaLab",
  kind: "analysis",
  priority: 40,
});

export const MarketProvider = createStub({
  id: "market",
  label: "Market",
  kind: "odds",
  priority: 50,
});

export const NewsProvider = createStub({
  id: "news",
  label: "News",
  kind: "news",
  priority: 60,
});

export const SocialProvider = createStub({
  id: "social",
  label: "Social",
  kind: "social",
  priority: 70,
});

export const STUB_PROVIDER_IDS = [
  "jra",
  "jbis",
  "netkeiba",
  "keibalab",
  "market",
  "news",
  "social",
];
