/* ========================================
   Odds Synchronizer — Ver7.8
   ======================================== */

import { emitEvent } from "../update/event-watcher.js";
import {
  diffOdds,
  recordOddsChange,
} from "./odds-history-manager.js";
import {
  getOddsOverlay,
  setOddsOverlay,
  clearOddsOverlay,
  getLastOddsFingerprint,
  setLastOddsFingerprint,
  beginOddsSync,
  endOddsSync,
} from "./odds-overlay.js";

export function fingerprintOdds(items = []) {
  return (items || [])
    .map(
      (o) =>
        `${o.number}|${o.winOdds}|${o.placeOdds}|${o.popularity}|${o.marketIndex ?? ""}`
    )
    .sort()
    .join("\n");
}

export function syncOdds(items = [], options = {}) {
  if (!beginOddsSync()) {
    return {
      changed: false,
      changes: [],
      fingerprint: getLastOddsFingerprint(),
      skipped: true,
      reason: "re-entrancy",
    };
  }

  try {
    const prev = getOddsOverlay()?.odds || [];
    const fp = fingerprintOdds(items);
    const prevFp = getLastOddsFingerprint();
    const changes = diffOdds(prev, items);
    const changed = fp !== prevFp;

    const overlay = {
      odds: items,
      fingerprint: fp,
      updatedAt: new Date().toISOString(),
      meta: options.meta || {},
    };
    setOddsOverlay(overlay);
    setLastOddsFingerprint(fp);

    if (changed && changes.length) {
      for (const c of changes) {
        recordOddsChange(c.type, c, c.horse || "");
      }
    }

    const allowEmit =
      changed &&
      options.emitUpdate === true &&
      prevFp != null &&
      !options.silent &&
      changes.length > 0;

    if (allowEmit) {
      const primary = changes[0];
      emitEvent({
        type: primary?.type || "odds_updated",
        detail: summarizeChanges(changes),
        payload: {
          oddsOnly: true,
          changes,
          fingerprint: fp,
          count: items.length,
        },
        source: "odds-engine",
      });
    }

    return { changed, changes, fingerprint: fp, overlay };
  } finally {
    endOddsSync();
  }
}

function summarizeChanges(changes = []) {
  if (!changes.length) return "Odds 同期";
  const c = changes[0];
  const map = {
    odds_updated: `オッズ更新: ${c.number}番`,
    popularity_changed: `人気変動: ${c.number}番`,
    market_index_updated: `市場指数更新: ${c.number}番`,
    odds_added: `オッズ追加: ${c.number}番`,
  };
  return map[c.type] || `Odds変更: ${c.type}`;
}

export {
  getOddsOverlay,
  clearOddsOverlay,
  getLastOddsFingerprint,
  setLastOddsFingerprint,
};

export const OddsSynchronizer = {
  sync: syncOdds,
  fingerprint: fingerprintOdds,
  getOverlay: getOddsOverlay,
  clearOverlay: clearOddsOverlay,
};
