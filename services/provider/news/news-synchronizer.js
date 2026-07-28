/* ========================================
   NewsSynchronizer — Ver10.4（Provider 層）
   新着・更新・取消・重要ニュース変更時のみ同期
   ======================================== */

import { emitEvent } from "../../update/event-watcher.js";
import {
  getNewsOverlay,
  setNewsOverlay,
  getLastNewsFingerprint,
  setLastNewsFingerprint,
  beginNewsSync,
  endNewsSync,
} from "../../news/news-overlay.js";
import {
  diffNews,
  loadNewsHistory,
} from "../../news/news-synchronizer.js";
import { NEWS_CATEGORY } from "../../news/news-categories.js";
import { normalizeRealNews, fingerprintNewsItems } from "./news-normalizer.js";
import { validateRealNews } from "./news-validator.js";

export const NEWS_PROVIDER_SYNC_VERSION = "10.4.0";
export const REAL_NEWS_STORE_KEY = "papapa_iq_real_news_v104";

let memoryState = null;
let updateCount = 0;

export function getRealNewsState() {
  if (memoryState) return memoryState;
  try {
    const raw = sessionStorage.getItem(REAL_NEWS_STORE_KEY);
    if (!raw) return null;
    memoryState = JSON.parse(raw);
    return memoryState;
  } catch {
    return null;
  }
}

export function setRealNewsState(state) {
  memoryState = state || null;
  try {
    if (!state) sessionStorage.removeItem(REAL_NEWS_STORE_KEY);
    else sessionStorage.setItem(REAL_NEWS_STORE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  return memoryState;
}

export function clearRealNewsState() {
  memoryState = null;
  try {
    sessionStorage.removeItem(REAL_NEWS_STORE_KEY);
  } catch {
    /* ignore */
  }
}

export function getNewsUpdateCount() {
  return updateCount || getRealNewsState()?.updateCount || 0;
}

export function fingerprintRealNews(items = []) {
  return `v104:${fingerprintNewsItems(items)}`;
}

export function syncRealNews(parsed, options = {}) {
  if (!beginNewsSync()) {
    return {
      ok: false,
      changed: false,
      skipped: true,
      reason: "re-entrancy",
      state: getRealNewsState(),
    };
  }

  try {
    const validation =
      options.validation ||
      validateRealNews(parsed, {
        raceNumber: options.raceNumber ?? parsed.meta?.raceNumber,
      });
    if (!validation.ok || !validation.acceptedItems?.length) {
      return {
        ok: false,
        changed: false,
        skipped: false,
        reason: "validation_failed",
        validation,
        message: "ニュース情報を取得できませんでした",
        state: getRealNewsState(),
      };
    }

    const normalized = normalizeRealNews(
      validation.acceptedItems,
      { ...parsed.meta, providerId: parsed.providerId },
      {
        providerId: parsed.providerId || "real-news",
        stage: options.stage,
      }
    );
    const items = normalized.items;
    const fp = fingerprintRealNews(items);
    const prevState = getRealNewsState();
    const prevFp = prevState?.fingerprint || getLastNewsFingerprint();
    const prevItems = prevState?.items || getNewsOverlay()?.items || [];
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
        message: "ニュースに変更なし（再取得スキップ）",
      };
    }

    const changes = filterSmartNewsChanges(diffNews(prevItems, items));
    if (changed) {
      updateCount = (prevState?.updateCount || updateCount || 0) + 1;
    }

    const state = {
      version: NEWS_PROVIDER_SYNC_VERSION,
      source: "real-news",
      providerId: parsed.providerId || "real-news",
      providerName:
        items[0]?.providerName ||
        parsed.meta?.providerName ||
        "Real News",
      updatedAt: new Date().toISOString(),
      newsUpdatedAt: parsed.meta?.updatedAt || new Date().toISOString(),
      fingerprint: fp,
      items,
      newsModels: normalized.newsModels,
      aggregate: normalized.aggregate,
      scores: normalized.scores,
      meta: parsed.meta || {},
      validation: {
        ok: validation.ok,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
        rejectedCount: validation.rejectedCount || 0,
      },
      updateCount,
      changes,
      normalized,
      count: items.length,
    };

    setRealNewsState(state);
    setNewsOverlay({
      version: "10.4.0",
      source: "real-news",
      providerId: state.providerId,
      updatedAt: state.updatedAt,
      items: state.items,
      fingerprint: fp,
      meta: state.meta,
    });
    setLastNewsFingerprint(fp);

    const allowEmit =
      changed &&
      options.emitUpdate === true &&
      prevFp != null &&
      !options.silent &&
      changes.length > 0;

    if (allowEmit) {
      const primary = changes[0];
      emitEvent({
        type: primary?.type || "news_added",
        detail: changes.map((c) => c.type).join(", "),
        payload: {
          newsOnly: true,
          changes,
          fingerprint: fp,
          count: items.length,
          providerId: state.providerId,
        },
        source: "real-news",
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
      message: changed ? "Real News 同期完了" : "変更なし",
    };
  } finally {
    endNewsSync();
  }
}

/** Smart Update: 新着・更新・取消・重要のみ */
function filterSmartNewsChanges(changes = []) {
  return (changes || []).filter((c) => {
    if (!c) return false;
    if (
      ["news_added", "news_updated", "news_scratch", "news_important"].includes(
        c.type
      )
    ) {
      return true;
    }
    if (c.to?.category === NEWS_CATEGORY.SCRATCH) return true;
    if ((c.to?.importanceScore || 0) >= 70) return true;
    return false;
  });
}

export function getRealNewsDashboard() {
  const state = getRealNewsState();
  if (!state) {
    return {
      available: false,
      providerId: null,
      status: "idle",
      count: 0,
      updateCount: getNewsUpdateCount(),
      updatedAt: null,
      validation: null,
      syncStatus: "—",
      history: loadNewsHistory().slice(0, 5),
    };
  }
  return {
    available: true,
    providerId: state.providerId,
    providerName: state.providerName,
    status: "online",
    count: state.count || state.items?.length || 0,
    updateCount: state.updateCount || 0,
    updatedAt: state.newsUpdatedAt || state.updatedAt,
    validation: state.validation,
    syncStatus: "synced",
    fingerprint: state.fingerprint,
    scores: state.scores,
    aggregate: state.aggregate,
    items: state.items,
    history: loadNewsHistory().slice(0, 5),
  };
}

export const NewsSynchronizer = {
  sync: syncRealNews,
  getState: getRealNewsState,
  setState: setRealNewsState,
  clear: clearRealNewsState,
  fingerprint: fingerprintRealNews,
  dashboard: getRealNewsDashboard,
  version: NEWS_PROVIDER_SYNC_VERSION,
};
