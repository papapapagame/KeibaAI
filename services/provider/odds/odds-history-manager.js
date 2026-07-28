/* ========================================
   OddsHistoryManager — Ver10.2（Provider 層）
   オッズ変動履歴・更新回数
   ======================================== */

import {
  recordOddsChange,
  loadOddsHistory,
  diffOdds,
} from "../../odds/odds-history-manager.js";

export const ODDS_HISTORY_MANAGER_VERSION = "10.2.0";
const UPDATE_COUNT_KEY = "papapa_iq_real_odds_update_count_v102";

export function getOddsUpdateCount() {
  try {
    return Number(sessionStorage.getItem(UPDATE_COUNT_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function bumpOddsUpdateCount() {
  const next = getOddsUpdateCount() + 1;
  try {
    sessionStorage.setItem(UPDATE_COUNT_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function resetOddsUpdateCount() {
  try {
    sessionStorage.removeItem(UPDATE_COUNT_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * 変更を履歴へ記録し、更新回数を加算
 */
export function appendOddsHistoryFromDiff(prev = [], next = [], note = "") {
  const changes = diffOdds(prev, next);
  if (!changes.length) return { changes: [], updateCount: getOddsUpdateCount() };

  for (const c of changes) {
    recordOddsChange(c.type, c, note || "Real Odds sync");
  }
  const updateCount = bumpOddsUpdateCount();
  return { changes, updateCount };
}

export function listRecentOddsHistory(limit = 12) {
  return loadOddsHistory().slice(0, limit);
}

export const OddsHistoryManager = {
  appendFromDiff: appendOddsHistoryFromDiff,
  list: listRecentOddsHistory,
  updateCount: getOddsUpdateCount,
  bump: bumpOddsUpdateCount,
  reset: resetOddsUpdateCount,
  version: ODDS_HISTORY_MANAGER_VERSION,
};
