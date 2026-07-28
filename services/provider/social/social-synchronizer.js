/* ========================================
   SocialSynchronizer — Ver10.5（Provider 層）
   急上昇・カテゴリ変化・投稿数急増・重要トレンド時のみ同期
   ======================================== */

import { emitEvent } from "../../update/event-watcher.js";
import {
  getSocialOverlay,
  setSocialOverlay,
  getLastSocialFingerprint,
  setLastSocialFingerprint,
  beginSocialSync,
  endSocialSync,
} from "../../social/social-overlay.js";
import {
  diffSocial,
  loadSocialHistory,
  fingerprintSocial,
} from "../../social/social-synchronizer.js";
import { toAiSocialPayload } from "../../social/social-merge.js";
import { normalizeRealSocial } from "./social-normalizer.js";
import { validateRealSocial } from "./social-validator.js";

export const SOCIAL_PROVIDER_SYNC_VERSION = "10.5.0";
export const REAL_SOCIAL_STORE_KEY = "papapa_iq_real_social_v105";

let memoryState = null;
let updateCount = 0;

export function getRealSocialState() {
  if (memoryState) return memoryState;
  try {
    const raw = sessionStorage.getItem(REAL_SOCIAL_STORE_KEY);
    if (!raw) return null;
    memoryState = JSON.parse(raw);
    return memoryState;
  } catch {
    return null;
  }
}

export function setRealSocialState(state) {
  memoryState = state || null;
  try {
    if (!state) sessionStorage.removeItem(REAL_SOCIAL_STORE_KEY);
    else sessionStorage.setItem(REAL_SOCIAL_STORE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  return memoryState;
}

export function clearRealSocialState() {
  memoryState = null;
  try {
    sessionStorage.removeItem(REAL_SOCIAL_STORE_KEY);
  } catch {
    /* ignore */
  }
}

export function getSocialUpdateCount() {
  return updateCount || getRealSocialState()?.updateCount || 0;
}

export function fingerprintRealSocial(items = [], trends = null) {
  return `v105:${fingerprintSocial(items, trends)}`;
}

export function syncRealSocial(parsed, options = {}) {
  if (!beginSocialSync()) {
    return {
      ok: false,
      changed: false,
      skipped: true,
      reason: "re-entrancy",
      state: getRealSocialState(),
    };
  }

  try {
    const validation =
      options.validation ||
      validateRealSocial(parsed, {
        raceNumber: options.raceNumber ?? parsed.meta?.raceNumber,
      });
    if (!validation.ok || !validation.acceptedItems?.length) {
      return {
        ok: false,
        changed: false,
        skipped: false,
        reason: "validation_failed",
        validation,
        message: "SNS情報を取得できませんでした",
        state: getRealSocialState(),
      };
    }

    const normalized = normalizeRealSocial(
      validation.acceptedItems,
      { ...parsed.meta, providerId: parsed.providerId },
      {
        providerId: parsed.providerId || "real-social",
        stage: options.stage,
      }
    );
    const items = normalized.items;
    const trends = normalized.trends;
    const fp = fingerprintRealSocial(items, trends);
    const prevState = getRealSocialState();
    const prevFp = prevState?.fingerprint || getLastSocialFingerprint();
    const prevOverlay = getSocialOverlay();
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
        message: "SNSに変更なし（再取得スキップ）",
      };
    }

    const changes = filterSmartSocialChanges(
      diffSocial(prevOverlay, items, trends)
    );
    if (changed) {
      updateCount = (prevState?.updateCount || updateCount || 0) + 1;
    }

    const state = {
      version: SOCIAL_PROVIDER_SYNC_VERSION,
      source: "real-social",
      providerId: parsed.providerId || "real-social",
      providerName:
        items[0]?.providerName ||
        parsed.meta?.providerName ||
        "Real Social",
      updatedAt: new Date().toISOString(),
      socialUpdatedAt: parsed.meta?.updatedAt || new Date().toISOString(),
      fingerprint: fp,
      items,
      trends,
      socialModel: normalized.socialModel,
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

    setRealSocialState(state);
    setSocialOverlay({
      version: "10.5.0",
      source: "real-social",
      providerId: state.providerId,
      updatedAt: state.updatedAt,
      items: state.items,
      trends: state.trends,
      aiPayload: toAiSocialPayload(state.trends),
      fingerprint: fp,
      itemCount: items.length,
      syncState: "ok",
      meta: state.meta,
      validation: state.validation,
    });
    setLastSocialFingerprint(fp);

    const allowEmit =
      changed &&
      options.emitUpdate === true &&
      prevFp != null &&
      !options.silent &&
      changes.length > 0;

    if (allowEmit) {
      const primary = changes[0];
      emitEvent({
        type: primary?.type || "social_spike",
        detail: changes.map((c) => c.type).join(", "),
        payload: {
          socialOnly: true,
          changes,
          fingerprint: fp,
          count: items.length,
          providerId: state.providerId,
          reasons: changes.map((c) => c.type),
        },
        source: "real-social",
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
      message: changed ? "Real Social 同期完了" : "変更なし",
    };
  } finally {
    endSocialSync();
  }
}

/** Smart Update: 急上昇・カテゴリ変化・投稿数急増・重要トレンド */
function filterSmartSocialChanges(changes = []) {
  return (changes || []).filter((c) =>
    [
      "social_spike",
      "social_important",
      "social_trend_change",
      "social_topic_added",
    ].includes(c?.type)
  );
}

export function getRealSocialDashboard() {
  const state = getRealSocialState();
  if (!state) {
    return {
      available: false,
      providerId: null,
      status: "idle",
      count: 0,
      updateCount: getSocialUpdateCount(),
      updatedAt: null,
      validation: null,
      syncStatus: "—",
      history: loadSocialHistory().slice(0, 5),
    };
  }
  return {
    available: true,
    providerId: state.providerId,
    providerName: state.providerName,
    status: "online",
    count: state.count || state.items?.length || 0,
    updateCount: state.updateCount || 0,
    updatedAt: state.socialUpdatedAt || state.updatedAt,
    validation: state.validation,
    syncStatus: "synced",
    fingerprint: state.fingerprint,
    scores: state.scores,
    trends: state.trends,
    items: state.items,
    history: loadSocialHistory().slice(0, 5),
  };
}

export const SocialSynchronizer = {
  sync: syncRealSocial,
  getState: getRealSocialState,
  setState: setRealSocialState,
  clear: clearRealSocialState,
  fingerprint: fingerprintRealSocial,
  dashboard: getRealSocialDashboard,
  version: SOCIAL_PROVIDER_SYNC_VERSION,
};
