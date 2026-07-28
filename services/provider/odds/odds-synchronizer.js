/* ========================================
   OddsSynchronizer — Ver10.2
   単勝/複勝/人気/更新時刻の変更時のみ同期
   ======================================== */

import { emitEvent } from "../../update/event-watcher.js";
import {
  getOddsOverlay,
  setOddsOverlay,
  getLastOddsFingerprint,
  setLastOddsFingerprint,
  beginOddsSync,
  endOddsSync,
} from "../../odds/odds-overlay.js";
import { normalizeRealOdds } from "./odds-normalizer.js";
import { validateRealOdds } from "./odds-validator.js";
import {
  appendOddsHistoryFromDiff,
  getOddsUpdateCount,
  listRecentOddsHistory,
} from "./odds-history-manager.js";

export const ODDS_PROVIDER_SYNC_VERSION = "10.2.0";
export const REAL_ODDS_STORE_KEY = "papapa_iq_real_odds_v102";

let memoryState = null;

export function getRealOddsState() {
  if (memoryState) return memoryState;
  try {
    const raw = sessionStorage.getItem(REAL_ODDS_STORE_KEY);
    if (!raw) return null;
    memoryState = JSON.parse(raw);
    return memoryState;
  } catch {
    return null;
  }
}

export function setRealOddsState(state) {
  memoryState = state || null;
  try {
    if (!state) sessionStorage.removeItem(REAL_ODDS_STORE_KEY);
    else sessionStorage.setItem(REAL_ODDS_STORE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  return memoryState;
}

export function clearRealOddsState() {
  memoryState = null;
  try {
    sessionStorage.removeItem(REAL_ODDS_STORE_KEY);
  } catch {
    /* ignore */
  }
}

export function fingerprintRealOdds(items = [], updatedAt = "") {
  const body = (items || [])
    .map(
      (o) =>
        `${o.number}|${o.winOdds}|${o.placeOdds}|${o.popularity}|${o.updatedAt || ""}`
    )
    .sort()
    .join("\n");
  return `v102:${updatedAt || ""}#${body}`;
}

export function syncRealOdds(parsed, options = {}) {
  if (!beginOddsSync()) {
    return {
      ok: false,
      changed: false,
      skipped: true,
      reason: "re-entrancy",
      state: getRealOddsState(),
    };
  }

  try {
    const validation = options.validation || validateRealOdds(parsed);
    if (!validation.ok) {
      return {
        ok: false,
        changed: false,
        skipped: false,
        reason: "validation_failed",
        validation,
        message: "オッズ情報を取得できませんでした",
        state: getRealOddsState(),
      };
    }

    const stage = Number(options.stage) || 7;
    const normalized = normalizeRealOdds(
      { ...parsed, items: validation.acceptedItems },
      validation,
      stage
    );
    const updatedAt =
      parsed.meta?.updatedAt ||
      normalized.odds[0]?.updatedAt ||
      new Date().toISOString();
    const fp = fingerprintRealOdds(normalized.odds, updatedAt);
    const prevState = getRealOddsState();
    const prevFp = prevState?.fingerprint || getLastOddsFingerprint();
    const prevOdds = prevState?.odds || getOddsOverlay()?.odds || [];
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
        message: "オッズに変更なし（再取得スキップ）",
      };
    }

    const hist = appendOddsHistoryFromDiff(
      prevOdds,
      normalized.odds,
      "Real Odds"
    );

    const state = {
      version: ODDS_PROVIDER_SYNC_VERSION,
      source: "real-odds",
      providerId: parsed.providerId || "real-odds",
      providerName: parsed.meta?.providerName || "real-odds",
      updatedAt: new Date().toISOString(),
      oddsUpdatedAt: updatedAt,
      fingerprint: fp,
      odds: normalized.odds,
      oddsEntries: normalized.oddsEntries,
      horses: normalized.horses,
      marketStatus: normalized.marketStatus,
      meta: parsed.meta || {},
      phase: parsed.meta?.phase || "final",
      validation: {
        ok: validation.ok,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
        rejectedCount: validation.rejectedCount,
      },
      updateCount: hist.updateCount || getOddsUpdateCount(),
      changes: hist.changes || [],
      normalized,
    };

    setRealOddsState(state);
    setOddsOverlay({
      version: "10.2.0",
      source: "real-odds",
      providerId: state.providerId,
      updatedAt: state.updatedAt,
      odds: state.odds,
      fingerprint: fp,
      meta: state.meta,
    });
    setLastOddsFingerprint(fp);

    const allowEmit =
      changed &&
      options.emitUpdate === true &&
      prevFp != null &&
      !options.silent &&
      (hist.changes || []).length > 0;

    if (allowEmit) {
      const primary = hist.changes[0];
      emitEvent({
        type: primary?.type || "odds_updated",
        detail: summarizeOddsChanges(hist.changes),
        payload: {
          oddsOnly: true,
          changes: hist.changes,
          fingerprint: fp,
          count: state.odds.length,
          providerId: state.providerId,
        },
        source: "real-odds",
      });
    }

    return {
      ok: true,
      changed,
      skipped: false,
      fingerprint: fp,
      validation,
      normalized,
      changes: hist.changes,
      state,
      message: changed ? "Real Odds 同期完了" : "変更なし",
    };
  } finally {
    endOddsSync();
  }
}

export function getRealOddsDashboard() {
  const state = getRealOddsState();
  if (!state) {
    return {
      available: false,
      providerId: null,
      status: "idle",
      count: 0,
      updateCount: getOddsUpdateCount(),
      updatedAt: null,
      validation: null,
      syncStatus: "—",
      history: listRecentOddsHistory(5),
    };
  }
  return {
    available: true,
    providerId: state.providerId,
    providerName: state.providerName,
    status: "ready",
    count: state.odds?.length || 0,
    updateCount: state.updateCount ?? getOddsUpdateCount(),
    updatedAt: state.oddsUpdatedAt || state.updatedAt,
    validation: state.validation,
    syncStatus: "synced",
    fingerprint: state.fingerprint,
    source: state.source,
    marketStatus: state.marketStatus,
    history: listRecentOddsHistory(8),
  };
}

function summarizeOddsChanges(changes = []) {
  if (!changes.length) return "Odds 同期";
  return [...new Set(changes.map((c) => c.type))].join(", ");
}

export const OddsSynchronizer = {
  sync: syncRealOdds,
  getState: getRealOddsState,
  setState: setRealOddsState,
  clear: clearRealOddsState,
  fingerprint: fingerprintRealOdds,
  dashboard: getRealOddsDashboard,
  version: ODDS_PROVIDER_SYNC_VERSION,
};
