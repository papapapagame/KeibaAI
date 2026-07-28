/* ========================================
   Social Synchronizer — Ver8.1
   Smart Update: new topic / spike / important / trend
   ======================================== */

import { emitEvent } from "../update/event-watcher.js";
import { SOCIAL_CATEGORY } from "./social-categories.js";
import {
  getSocialOverlay,
  setSocialOverlay,
  clearSocialOverlay,
  getLastSocialFingerprint,
  setLastSocialFingerprint,
  beginSocialSync,
  endSocialSync,
} from "./social-overlay.js";
import { toAiSocialPayload } from "./social-merge.js";

const HISTORY_KEY = "papapa_iq_social_history_v81";
const MAX_HISTORY = 120;
const SPIKE_THRESHOLD = 80;
const TREND_DELTA = 8;

export function fingerprintSocial(items = [], trends = null) {
  const ids = (items || [])
    .map(
      (n) =>
        `${n.id}|${n.topicKey}|${n.category}|${n.updatedAt}|${n.postCount}|${(n.horses || []).join(",")}`
    )
    .sort()
    .join("\n");
  const scores = trends?.scores
    ? `${trends.scores.trend}:${trends.scores.attention}:${trends.scores.momentum}:${trends.scores.confidence}`
    : "";
  return `${ids}\n#${scores}#${trends?.totalPosts || 0}`;
}

/**
 * Persist overlay + optionally emit Smart Update events
 */
export function syncSocialOverlay(items = [], trends = null, options = {}) {
  if (!beginSocialSync()) {
    return {
      changed: false,
      changes: [],
      reasons: [],
      fingerprint: getLastSocialFingerprint(),
      skipped: true,
      reason: "re-entrancy",
    };
  }

  try {
    const prev = getSocialOverlay();
    const fp = fingerprintSocial(items, trends);
    const prevFp = getLastSocialFingerprint();
    const changes = diffSocial(prev, items, trends);
    const changed = fp !== prevFp;
    const reasons = changes.map((c) => c.type);

    const overlay = {
      items: (items || []).map(stripForStore),
      trends,
      aiPayload: toAiSocialPayload(trends),
      fingerprint: fp,
      updatedAt: new Date().toISOString(),
      itemCount: (items || []).length,
      syncState: "ok",
      meta: options.meta || {},
      validation: options.validation || null,
    };
    setSocialOverlay(overlay);
    setLastSocialFingerprint(fp);

    if (changed && changes.length) {
      for (const c of changes) {
        recordSocialHistory(c.type, c);
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
        type: primary?.type || "social_topic_added",
        detail: summarizeChanges(changes),
        payload: {
          socialOnly: true,
          changes,
          fingerprint: fp,
          count: items.length,
          reasons,
        },
        source: "social-engine",
      });
    }

    return {
      changed,
      changes,
      reasons,
      fingerprint: fp,
      overlay,
    };
  } finally {
    endSocialSync();
  }
}

export function diffSocial(prevOverlay, nextItems = [], nextTrends = null) {
  const prevItems = prevOverlay?.items || [];
  const prevMap = new Map((prevItems || []).map((n) => [String(n.id), n]));
  const changes = [];

  for (const n of nextItems || []) {
    const p = prevMap.get(String(n.id));
    if (!p) {
      const type =
        n.category === SOCIAL_CATEGORY.SCRATCH
          ? "social_important"
          : n.importanceHint === "critical" || n.importanceHint === "high"
            ? "social_important"
            : "social_topic_added";
      changes.push({
        type,
        id: n.id,
        category: n.category,
        topicKey: n.topicKey,
      });
      continue;
    }

    const spikePct = trendChangePct(n.postCount, n.prevPostCount);
    if (spikePct != null && spikePct >= SPIKE_THRESHOLD) {
      changes.push({
        type: "social_spike",
        id: n.id,
        category: n.category,
        topicKey: n.topicKey,
        spikePct,
      });
    } else if (
      Number(p.postCount) !== Number(n.postCount) ||
      String(p.updatedAt) !== String(n.updatedAt) ||
      String(p.category) !== String(n.category)
    ) {
      // category / count change without spike — may still be trend
    }
  }

  const prevTrend = prevOverlay?.trends?.scores?.trend ?? null;
  const currTrend = nextTrends?.scores?.trend ?? null;
  if (
    prevTrend != null &&
    currTrend != null &&
    Math.abs(currTrend - prevTrend) >= TREND_DELTA
  ) {
    changes.push({
      type: "social_trend_change",
      from: prevTrend,
      to: currTrend,
    });
  }

  // important category newly present
  const prevCats = new Set(
    (prevOverlay?.trends?.categories || []).map((c) => c.category)
  );
  for (const c of nextTrends?.categories || []) {
    if (
      !prevCats.has(c.category) &&
      ["scratch", "training", "jockey", "paddock"].includes(c.category)
    ) {
      changes.push({
        type: "social_important",
        category: c.category,
        reason: "important_category_added",
      });
    }
  }

  return dedupeChanges(changes);
}

function stripForStore(item = {}) {
  const {
    body: _b,
    text: _t,
    content: _c,
    post: _p,
    comment: _cm,
    image: _i,
    video: _v,
    media: _m,
    ...rest
  } = item;
  return {
    id: rest.id,
    topicKey: rest.topicKey,
    category: rest.category,
    categoryLabel: rest.categoryLabel,
    publishedAt: rest.publishedAt,
    updatedAt: rest.updatedAt,
    raceNumber: rest.raceNumber,
    venueId: rest.venueId,
    horses: rest.horses || [],
    jockeys: rest.jockeys || [],
    trainers: rest.trainers || [],
    postType: rest.postType,
    source: rest.source,
    postCount: rest.postCount || 0,
    prevPostCount: rest.prevPostCount,
    importanceHint: rest.importanceHint || null,
  };
}

function trendChangePct(curr, prev) {
  const c = Number(curr) || 0;
  if (prev == null) return null;
  const p = Number(prev) || 0;
  if (p <= 0) return c > 0 ? 100 : 0;
  return Math.round(((c - p) / p) * 100);
}

function dedupeChanges(changes = []) {
  const seen = new Set();
  const out = [];
  for (const c of changes) {
    const key = `${c.type}:${c.id || c.category || c.from || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

function summarizeChanges(changes = []) {
  const types = [...new Set(changes.map((c) => c.type))];
  return types.join(", ");
}

export function loadSocialHistory() {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function recordSocialHistory(type, detail = {}) {
  try {
    const list = loadSocialHistory();
    list.unshift({
      type,
      at: new Date().toISOString(),
      id: detail.id || null,
      category: detail.category || null,
      topicKey: detail.topicKey || null,
    });
    sessionStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(list.slice(0, MAX_HISTORY))
    );
  } catch {
    /* ignore */
  }
}

export {
  getSocialOverlay,
  clearSocialOverlay,
  getLastSocialFingerprint,
  setLastSocialFingerprint,
};

export const SocialSynchronizer = {
  sync: syncSocialOverlay,
  fingerprint: fingerprintSocial,
  diff: diffSocial,
  history: loadSocialHistory,
};
