/* ========================================
   Entry Synchronizer — Ver7.6.1
   変更時のみ通知。再入禁止。一方向フロー。
   ======================================== */

import { emitEvent } from "../update/event-watcher.js";
import {
  diffEntryStatuses,
  recordStatusChange,
} from "./entry-state-manager.js";
import { fingerprintEntries } from "./entry-data-connector.js";
import {
  getEntryOverlay,
  setEntryOverlay,
  clearEntryOverlay,
  getLastEntryFingerprint,
  setLastEntryFingerprint,
  beginEntrySync,
  endEntrySync,
} from "./entry-overlay.js";

/**
 * @returns {{ changed: boolean, changes: array, fingerprint: string }}
 */
export function syncEntries(entries = [], options = {}) {
  if (!beginEntrySync()) {
    return {
      changed: false,
      changes: [],
      fingerprint: getLastEntryFingerprint(),
      skipped: true,
      reason: "re-entrancy",
    };
  }

  try {
    const prev = getEntryOverlay()?.entries || [];
    const fp = fingerprintEntries(entries);
    const prevFp = getLastEntryFingerprint();
    const changes = diffEntryStatuses(prev, entries);
    // force は再取得フラグであり、内容同一なら changed=false
    const changed = fp !== prevFp;

    const overlay = {
      version: "7.6.0",
      source: "entry-engine",
      updatedAt: new Date().toISOString(),
      entries,
      fingerprint: fp,
      meta: options.meta || {},
    };
    setEntryOverlay(overlay);
    setLastEntryFingerprint(fp);

    if (changed && changes.length) {
      for (const c of changes) {
        if (c.from && c.to) {
          recordStatusChange(c.horseId, c.from, c.to, c.horseName || "");
        }
      }
    }

    // 明示的 emitUpdate:true かつ内容変更かつ初回でないときのみ通知
    const allowEmit =
      changed &&
      options.emitUpdate === true &&
      prevFp != null &&
      !options.silent &&
      changes.length > 0;

    if (allowEmit) {
      const primary = changes[0];
      emitEvent({
        type: primary?.type || "entry_status_changed",
        detail: summarizeChanges(changes),
        payload: {
          entryOnly: true,
          changes,
          fingerprint: fp,
          count: entries.length,
        },
        source: "entry-engine",
      });
    }

    return { changed, changes, fingerprint: fp, overlay };
  } finally {
    endEntrySync();
  }
}

export {
  getEntryOverlay,
  clearEntryOverlay,
  getLastEntryFingerprint,
  setLastEntryFingerprint,
};

function summarizeChanges(changes = []) {
  if (!changes.length) return "Entry 同期";
  const c = changes[0];
  if (c.type === "entry_added") return `登録馬追加: ${c.horseName || c.horseId}`;
  if (c.type === "entry_scratched") return `登録取消: ${c.horseName || c.horseId}`;
  return `出走予定変更: ${c.horseName || c.horseId}`;
}

export const EntrySynchronizer = {
  sync: syncEntries,
  getOverlay: getEntryOverlay,
  clearOverlay: clearEntryOverlay,
  getFingerprint: getLastEntryFingerprint,
  setFingerprint: setLastEntryFingerprint,
};
