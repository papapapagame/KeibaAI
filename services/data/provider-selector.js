/* ========================================
   ProviderSelector — Ver7.0
   Mock / Real / Auto に応じて Provider を選択
   ======================================== */

import { getSourceMode } from "./source-mode.js";
import { createAllProviders, createProvider } from "./providers/index.js";
import { PROVIDER_STATUS } from "./providers/base-provider.js";

/**
 * モードに応じた Provider 選択結果
 * @returns {{ mode, primary, fallbacks, note }}
 */
export function selectProviders(options = {}) {
  const mode = options.mode || getSourceMode();
  const all = createAllProviders();
  const mock = createProvider("mock");
  const real = all.filter((p) => p.id !== "mock");

  if (mode === "mock") {
    return {
      mode,
      primary: mock,
      fallbacks: [],
      candidates: [mock],
      note: "Mock データソースを使用",
    };
  }

  if (mode === "real") {
    const implementedReal = real.filter((p) => p.implemented);
    if (!implementedReal.length) {
      return {
        mode,
        primary: null,
        fallbacks: [],
        candidates: real,
        note: "Provider未接続",
        blocked: true,
        blockReason: "Provider未接続",
      };
    }
    return {
      mode,
      primary: implementedReal[0],
      fallbacks: implementedReal.slice(1),
      candidates: implementedReal,
      note: `Real: ${implementedReal[0].id}`,
    };
  }

  // auto: real 実装があれば優先、なければ mock
  const implementedReal = real.filter((p) => p.implemented);
  if (implementedReal.length) {
    return {
      mode: "auto",
      primary: implementedReal[0],
      fallbacks: [mock, ...implementedReal.slice(1)],
      candidates: [...implementedReal, mock],
      note: `Auto → ${implementedReal[0].id}`,
    };
  }

  return {
    mode: "auto",
    primary: mock,
    fallbacks: [],
    candidates: [mock, ...real],
    note: "Auto → Mock（Real Provider 未接続のためフォールバック）",
  };
}

export function describeSelection(selection) {
  return {
    mode: selection.mode,
    primaryId: selection.primary?.id || null,
    primaryStatus: selection.primary
      ? selection.primary.implemented
        ? PROVIDER_STATUS.ONLINE
        : PROVIDER_STATUS.NOT_CONNECTED
      : PROVIDER_STATUS.NOT_CONNECTED,
    blocked: Boolean(selection.blocked),
    note: selection.note,
  };
}

export const ProviderSelector = {
  select: selectProviders,
  describe: describeSelection,
};
