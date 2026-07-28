/* ========================================
   Entry Synchronizer — Ver7.6
   Smart Update / Calendar 連携
   ======================================== */

import { emitEvent } from "../update/event-watcher.js";
import {
  diffEntryStatuses,
  recordStatusChange,
  getEntryStateSnapshot,
} from "./entry-state-manager.js";
import { fingerprintEntries } from "./entry-data-connector.js";

const OVERLAY_KEY = "papapa_iq_entry_overlay_v76";

let memoryOverlay = null;
let lastFingerprint = null;

export function getEntryOverlay() {
  if (memoryOverlay) return memoryOverlay;
  try {
    const raw = sessionStorage.getItem(OVERLAY_KEY);
    if (!raw) return null;
    memoryOverlay = JSON.parse(raw);
    return memoryOverlay;
  } catch {
    return null;
  }
}

export function clearEntryOverlay() {
  memoryOverlay = null;
  lastFingerprint = null;
  try {
    sessionStorage.removeItem(OVERLAY_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @returns {{ changed: boolean, changes: array, fingerprint: string }}
 */
export function syncEntries(entries = [], options = {}) {
  const prev = getEntryOverlay()?.entries || getEntryStateSnapshot().entries || [];
  const fp = fingerprintEntries(entries);
  const changes = diffEntryStatuses(prev, entries);
  const changed = options.force || fp !== lastFingerprint;

  const overlay = {
    version: "7.6.0",
    source: "entry-engine",
    updatedAt: new Date().toISOString(),
    entries,
    fingerprint: fp,
    meta: options.meta || {},
  };
  memoryOverlay = overlay;
  try {
    sessionStorage.setItem(OVERLAY_KEY, JSON.stringify(overlay));
  } catch {
    /* ignore */
  }

  if (changed && changes.length) {
    for (const c of changes) {
      if (c.from && c.to) {
        recordStatusChange(c.horseId, c.from, c.to, c.horseName || "");
      }
    }
  }

  if (changed && options.emitUpdate !== false && lastFingerprint != null) {
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

  lastFingerprint = fp;
  return { changed, changes, fingerprint: fp, overlay };
}

export function getLastEntryFingerprint() {
  return lastFingerprint || getEntryOverlay()?.fingerprint || null;
}

export function setLastEntryFingerprint(fp) {
  lastFingerprint = fp || null;
}

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
