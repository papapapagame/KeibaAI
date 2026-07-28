/* ========================================
   News Synchronizer — Ver8.0
   ======================================== */

import { emitEvent } from "../update/event-watcher.js";
import { NEWS_CATEGORY } from "./news-categories.js";
import {
  getNewsOverlay,
  setNewsOverlay,
  clearNewsOverlay,
  getLastNewsFingerprint,
  setLastNewsFingerprint,
  beginNewsSync,
  endNewsSync,
} from "./news-overlay.js";

const HISTORY_KEY = "papapa_iq_news_history_v80";
const MAX_HISTORY = 120;

export function fingerprintNews(items = []) {
  return (items || [])
    .map(
      (n) =>
        `${n.id}|${n.title}|${n.category}|${n.updatedAt}|${n.updateCount}|${(n.horses || []).join(",")}`
    )
    .sort()
    .join("\n");
}

export function syncNews(items = [], options = {}) {
  if (!beginNewsSync()) {
    return {
      changed: false,
      changes: [],
      fingerprint: getLastNewsFingerprint(),
      skipped: true,
      reason: "re-entrancy",
    };
  }

  try {
    const prev = getNewsOverlay()?.items || [];
    const fp = fingerprintNews(items);
    const prevFp = getLastNewsFingerprint();
    const changes = diffNews(prev, items);
    const changed = fp !== prevFp;

    const overlay = {
      items,
      fingerprint: fp,
      updatedAt: new Date().toISOString(),
      meta: options.meta || {},
    };
    setNewsOverlay(overlay);
    setLastNewsFingerprint(fp);

    if (changed && changes.length) {
      for (const c of changes) {
        recordNewsHistory(c.type, c);
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
        type: primary?.type || "news_added",
        detail: summarizeChanges(changes),
        payload: {
          newsOnly: true,
          changes,
          fingerprint: fp,
          count: items.length,
        },
        source: "news-engine",
      });
    }

    return { changed, changes, fingerprint: fp, overlay };
  } finally {
    endNewsSync();
  }
}

export function diffNews(prev = [], next = []) {
  const prevMap = new Map((prev || []).map((n) => [String(n.id), n]));
  const changes = [];
  for (const n of next || []) {
    const p = prevMap.get(String(n.id));
    if (!p) {
      const type =
        n.category === NEWS_CATEGORY.SCRATCH
          ? "news_scratch"
          : n.importanceScore >= 70 || n.importanceHint === "critical"
            ? "news_important"
            : "news_added";
      changes.push({ type, id: n.id, title: n.title, category: n.category });
      continue;
    }
    if (
      String(p.updatedAt) !== String(n.updatedAt) ||
      Number(p.updateCount) !== Number(n.updateCount) ||
      String(p.title) !== String(n.title)
    ) {
      changes.push({
        type: "news_updated",
        id: n.id,
        title: n.title,
        category: n.category,
      });
    }
  }
  return changes;
}

export function loadNewsHistory() {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function recordNewsHistory(type, detail = {}) {
  const entry = {
    id: `nh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    type,
    detail: {
      id: detail.id,
      title: detail.title,
      category: detail.category,
    },
  };
  const list = loadNewsHistory();
  list.unshift(entry);
  if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return entry;
}

function summarizeChanges(changes = []) {
  if (!changes.length) return "News 同期";
  const c = changes[0];
  const map = {
    news_added: `新着: ${c.title || c.id}`,
    news_updated: `更新: ${c.title || c.id}`,
    news_scratch: `取消情報: ${c.title || c.id}`,
    news_important: `重要ニュース: ${c.title || c.id}`,
  };
  return map[c.type] || `News変更: ${c.type}`;
}

export {
  getNewsOverlay,
  clearNewsOverlay,
  getLastNewsFingerprint,
  setLastNewsFingerprint,
};

export const NewsSynchronizer = {
  sync: syncNews,
  fingerprint: fingerprintNews,
  diff: diffNews,
  history: loadNewsHistory,
  getOverlay: getNewsOverlay,
  clearOverlay: clearNewsOverlay,
};
