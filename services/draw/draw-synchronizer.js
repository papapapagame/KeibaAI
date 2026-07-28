/* ========================================
   Draw Synchronizer — Ver7.7
   変更時のみ通知
   ======================================== */

import { emitEvent } from "../update/event-watcher.js";
import {
  diffDraws,
  recordDrawChange,
} from "./draw-state-manager.js";
import {
  getDrawOverlay,
  setDrawOverlay,
  clearDrawOverlay,
  getLastDrawFingerprint,
  setLastDrawFingerprint,
  beginDrawSync,
  endDrawSync,
} from "./draw-overlay.js";

export function fingerprintDraws(draws = []) {
  return (draws || [])
    .map(
      (d) =>
        `${d.number}|${d.frame}|${d.jockey}|${d.weight}|${d.scratched}|${d.excluded}|${d.riderChanged}|${d.frameConfirmed}|${d.jockeyConfirmed}|${d.weightConfirmed}`
    )
    .sort()
    .join("\n");
}

export function syncDraws(draws = [], options = {}) {
  if (!beginDrawSync()) {
    return {
      changed: false,
      changes: [],
      fingerprint: getLastDrawFingerprint(),
      skipped: true,
      reason: "re-entrancy",
    };
  }

  try {
    const prev = getDrawOverlay()?.draws || [];
    const fp = fingerprintDraws(draws);
    const prevFp = getLastDrawFingerprint();
    const changes = diffDraws(prev, draws);
    const changed = fp !== prevFp;

    const overlay = {
      draws,
      fingerprint: fp,
      updatedAt: new Date().toISOString(),
      meta: options.meta || {},
    };
    setDrawOverlay(overlay);
    setLastDrawFingerprint(fp);

    if (changed && changes.length) {
      for (const c of changes) {
        recordDrawChange(c.type, c, c.horse || "");
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
        type: primary?.type || "frame_confirmed",
        detail: summarizeChanges(changes),
        payload: {
          drawOnly: true,
          changes,
          fingerprint: fp,
          count: draws.length,
        },
        source: "draw-engine",
      });
    }

    return { changed, changes, fingerprint: fp, overlay };
  } finally {
    endDrawSync();
  }
}

function summarizeChanges(changes = []) {
  if (!changes.length) return "Draw 同期";
  const c = changes[0];
  const map = {
    frame_confirmed: `枠順確定: ${c.number}番`,
    frame_changed: `枠変更: ${c.number}番`,
    jockey_change: `騎手変更: ${c.number}番`,
    weight_change: `斤量変更: ${c.number}番`,
    scratched: `出走取消: ${c.number}番`,
    excluded: `競走除外: ${c.number}番`,
  };
  return map[c.type] || `Draw変更: ${c.type}`;
}

export {
  getDrawOverlay,
  clearDrawOverlay,
  getLastDrawFingerprint,
  setLastDrawFingerprint,
};

export const DrawSynchronizer = {
  sync: syncDraws,
  fingerprint: fingerprintDraws,
  getOverlay: getDrawOverlay,
  clearOverlay: clearDrawOverlay,
};
