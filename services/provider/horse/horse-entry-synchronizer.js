/* ========================================
   HorseEntrySynchronizer — Ver10.1
   取消・除外・騎手変更・斤量変更・出馬表更新時のみ同期
   ======================================== */

import { emitEvent } from "../../update/event-watcher.js";
import {
  getEntryOverlay,
  setEntryOverlay,
  getLastEntryFingerprint,
  setLastEntryFingerprint,
  beginEntrySync,
  endEntrySync,
} from "../../entry/entry-overlay.js";
import { normalizeEntryStatus, ENTRY_STATUS } from "../../entry/entry-status.js";
import { recordStatusChange } from "../../entry/entry-state-manager.js";
import { normalizeHorseEntries } from "./horse-entry-normalizer.js";
import { validateHorseEntries } from "./horse-entry-validator.js";

export const HORSE_ENTRY_SYNC_VERSION = "10.1.0";
export const REAL_HORSE_STORE_KEY = "papapa_iq_real_horse_entry_v101";

let memoryState = null;

export function getRealHorseState() {
  if (memoryState) return memoryState;
  try {
    const raw = sessionStorage.getItem(REAL_HORSE_STORE_KEY);
    if (!raw) return null;
    memoryState = JSON.parse(raw);
    return memoryState;
  } catch {
    return null;
  }
}

export function setRealHorseState(state) {
  memoryState = state || null;
  try {
    if (!state) sessionStorage.removeItem(REAL_HORSE_STORE_KEY);
    else sessionStorage.setItem(REAL_HORSE_STORE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  return memoryState;
}

export function clearRealHorseState() {
  memoryState = null;
  try {
    sessionStorage.removeItem(REAL_HORSE_STORE_KEY);
  } catch {
    /* ignore */
  }
}

export function fingerprintHorseEntries(entries = []) {
  return (entries || [])
    .map((e) => {
      const j =
        typeof e.jockey === "object"
          ? e.jockey?.name || e._rawJockey
          : e.jockey || e._rawJockey;
      const w = e.weight ?? e._rawWeight ?? e.carriedWeight ?? "";
      const f = e.frame ?? e._rawFrame ?? "";
      return [
        e.horseId || e.number,
        e.horseName || e.horse,
        e.entryStatus,
        e.number,
        f,
        j,
        w,
      ].join("|");
    })
    .sort()
    .join("\n");
}

export function diffHorseEntryChanges(prev = [], next = []) {
  const prevMap = new Map(
    (prev || []).map((e) => [String(e.horseId || e.number), e])
  );
  const changes = [];

  for (const n of next || []) {
    const key = String(n.horseId || n.number);
    const p = prevMap.get(key);
    const name = n.horseName || n.horse || "";

    if (!p) {
      changes.push({
        type: "entry_added",
        horseId: key,
        to: n.entryStatus,
        horseName: name,
      });
      continue;
    }

    const from = normalizeEntryStatus(p.entryStatus);
    const to = normalizeEntryStatus(n.entryStatus);
    if (from !== to) {
      changes.push({
        type: "entry_status_changed",
        horseId: key,
        from,
        to,
        horseName: name,
      });
      if (to === ENTRY_STATUS.SCRATCHED) {
        changes.push({
          type: "scratched",
          horseId: key,
          to,
          horseName: name,
        });
        changes.push({
          type: "entry_scratched",
          horseId: key,
          to,
          horseName: name,
        });
      }
      if (to === ENTRY_STATUS.EXCLUDED) {
        changes.push({
          type: "excluded",
          horseId: key,
          to,
          horseName: name,
        });
      }
    }

    const pj =
      typeof p.jockey === "object"
        ? p.jockey?.name || p._rawJockey
        : p.jockey || p._rawJockey;
    const nj =
      typeof n.jockey === "object"
        ? n.jockey?.name || n._rawJockey
        : n.jockey || n._rawJockey;
    if (String(pj || "") !== String(nj || "")) {
      changes.push({
        type: "jockey_change",
        horseId: key,
        from: pj,
        to: nj,
        horseName: name,
      });
    }

    const pw = p.weight ?? p._rawWeight ?? p.carriedWeight;
    const nw = n.weight ?? n._rawWeight ?? n.carriedWeight;
    if (String(pw ?? "") !== String(nw ?? "")) {
      changes.push({
        type: "weight_change",
        horseId: key,
        from: pw,
        to: nw,
        horseName: name,
      });
    }

    const pf = p.frame ?? p._rawFrame;
    const nf = n.frame ?? n._rawFrame;
    if (String(pf ?? "") !== String(nf ?? "")) {
      changes.push({
        type: "frame_confirmed",
        horseId: key,
        from: pf,
        to: nf,
        horseName: name,
      });
    }
  }

  if (!changes.length && (prev || []).length !== (next || []).length) {
    changes.push({ type: "entry_status_changed", detail: "field_size" });
  }

  return changes;
}

/**
 * 検証済み出馬表を同期。変更が無い場合は再同期しない。
 */
export function syncHorseEntries(parsed, options = {}) {
  if (!beginEntrySync()) {
    return {
      ok: false,
      changed: false,
      skipped: true,
      reason: "re-entrancy",
      state: getRealHorseState(),
    };
  }

  try {
    const validation = options.validation || validateHorseEntries(parsed);
    if (!validation.ok) {
      return {
        ok: false,
        changed: false,
        skipped: false,
        reason: "validation_failed",
        validation,
        message: "出馬表を取得できませんでした",
        state: getRealHorseState(),
      };
    }

    const stage =
      Number(options.stage) ||
      Number(parsed.meta?.defaultStage) ||
      5;
    const normalized = normalizeHorseEntries(
      {
        ...parsed,
        entries: validation.acceptedEntries,
      },
      validation,
      stage
    );

    const fp = fingerprintHorseEntries(normalized.entries);
    const prevState = getRealHorseState();
    const prevFp = prevState?.fingerprint || getLastEntryFingerprint();
    const prevEntries = prevState?.entries || getEntryOverlay()?.entries || [];
    const changes = diffHorseEntryChanges(prevEntries, normalized.entries);
    const changed = Boolean(options.force) || fp !== prevFp;

    if (!changed && prevState && !options.force) {
      return {
        ok: true,
        changed: false,
        skipped: true,
        reason: "unchanged",
        fingerprint: fp,
        validation,
        normalized: prevState.normalized || normalized,
        state: prevState,
        message: "出馬表に変更なし（再取得スキップ）",
      };
    }

    const state = {
      version: HORSE_ENTRY_SYNC_VERSION,
      source: "real-horse",
      providerId: parsed.providerId || "real-horse",
      updatedAt: new Date().toISOString(),
      fingerprint: fp,
      entries: normalized.entries,
      horses: normalized.horses,
      draws: normalized.draws,
      jockeys: normalized.jockeys,
      trainers: normalized.trainers,
      meta: parsed.meta || {},
      stage,
      confirmation: normalized.confirmation,
      validation: {
        ok: validation.ok,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
        rejectedCount: validation.rejectedCount,
      },
      normalized,
      changes,
    };

    setRealHorseState(state);
    setEntryOverlay({
      version: "10.1.0",
      source: "real-horse",
      providerId: state.providerId,
      updatedAt: state.updatedAt,
      entries: state.entries,
      fingerprint: fp,
      meta: state.meta,
    });
    setLastEntryFingerprint(fp);

    for (const c of changes) {
      if (c.from && c.to && c.type === "entry_status_changed") {
        recordStatusChange(c.horseId, c.from, c.to, c.horseName || "");
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
        type: primary?.type || "entry_status_changed",
        detail: summarizeHorseChanges(changes),
        payload: {
          entryOnly: true,
          changes,
          fingerprint: fp,
          count: state.entries.length,
          providerId: state.providerId,
        },
        source: "real-horse",
      });
    }

    return {
      ok: true,
      changed,
      skipped: false,
      fingerprint: fp,
      validation,
      normalized,
      changes,
      state,
      message: changed ? "Real Horse Entry 同期完了" : "変更なし",
    };
  } finally {
    endEntrySync();
  }
}

export function getRealHorseDashboard() {
  const state = getRealHorseState();
  if (!state) {
    return {
      available: false,
      providerId: null,
      status: "idle",
      count: 0,
      updatedAt: null,
      validation: null,
      syncStatus: "—",
    };
  }
  return {
    available: true,
    providerId: state.providerId,
    status: "ready",
    count: state.entries?.length || 0,
    updatedAt: state.updatedAt,
    validation: state.validation,
    syncStatus: "synced",
    fingerprint: state.fingerprint,
    source: state.source,
    confirmation: state.confirmation,
  };
}

function summarizeHorseChanges(changes = []) {
  if (!changes.length) return "Horse Entry 同期";
  const types = [...new Set(changes.map((c) => c.type))];
  return types.join(", ");
}

export const HorseEntrySynchronizer = {
  sync: syncHorseEntries,
  getState: getRealHorseState,
  setState: setRealHorseState,
  clear: clearRealHorseState,
  fingerprint: fingerprintHorseEntries,
  diff: diffHorseEntryChanges,
  dashboard: getRealHorseDashboard,
  version: HORSE_ENTRY_SYNC_VERSION,
};
