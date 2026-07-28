/* ========================================
   Social Repository — Ver8.1 / Ver10.5
   Metadata only (no body/images/videos)
   ======================================== */

import { API_BASE_URL } from "../../js/config.js";
import { getSocialMode } from "./social-mode.js";
import { loadRealSocial } from "../provider/social/index.js";

export async function fetchSocialRaw(options = {}) {
  const socialMode = options.socialMode || getSocialMode();

  // Ver10.5 Real Social（自動 Mock フォールバックなし）
  if (socialMode === "real") {
    const real = await loadRealSocial({
      ...options,
      stage: options.stage,
      force: options.forceRefresh || options.force,
      silent: options.silent !== false,
      emitUpdate: options.emitUpdate === true,
    });
    if (!real.ok) {
      return {
        ok: false,
        blocked: false,
        message: real.userMessage || "現在データを取得できません",
        userMessage: "現在データを取得できません",
        providerId: real.providerId || "real-social",
        mode: "real",
        items: [],
        validation: real.validation,
        error: real.error || null,
      };
    }
    return {
      ok: true,
      blocked: false,
      message: real.message || "Real Social",
      providerId: real.providerId || "real-social",
      providerName: real.providerName || "Real Social",
      mode: "real",
      items: stripBodies(real.items || real.social || []),
      meta: {
        ...(real.meta || {}),
        updatedAt: real.updatedAt || real.fetchedAt,
        skipped: real.skipped,
        changed: real.changed,
        fingerprint: real.fingerprint,
        updateCount: real.updateCount,
      },
      realBundle: real,
      validation: real.validation,
      scores: real.scores,
      trends: real.trends,
      socialModel: real.socialModel,
      provenance: { providerId: real.providerId, source: "real-social" },
    };
  }

  try {
    const socialJson = await fetchJsonOptional("social/mock-social.json");
    return {
      ok: true,
      blocked: false,
      message: "Mock Social Repository",
      providerId: "mock",
      providerName: "Mock Social",
      mode: "mock",
      items: stripBodies(socialJson?.items || []),
      meta: {
        raceDate: options.date || socialJson?.raceDate || null,
        venueId: options.venueId || socialJson?.venueId || null,
        raceNumber: options.raceNumber || socialJson?.raceNumber || null,
        updatedAt: socialJson?.updatedAt || new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      ok: false,
      blocked: false,
      message: err?.message || "Social fetch failed",
      userMessage: "SNS情報を取得できませんでした",
      providerId: "mock",
      mode: "mock",
      items: [],
    };
  }
}

/** 本文・画像・動画・コメントを破棄 */
function stripBodies(items = []) {
  return (items || []).map((raw) => {
    const {
      body: _b,
      text: _t,
      content: _c,
      html: _h,
      post: _p,
      posts: _ps,
      comment: _cm,
      comments: _cms,
      image: _i,
      images: _is,
      video: _v,
      videos: _vs,
      media: _m,
      caption: _cap,
      ...rest
    } = raw || {};
    return {
      id: rest.id || null,
      publishedAt: rest.publishedAt || null,
      topicKey: rest.topicKey || rest.topic || null,
      category: rest.category || "other",
      raceNumber: rest.raceNumber ?? null,
      venueId: rest.venueId || null,
      horses: Array.isArray(rest.horses) ? rest.horses : [],
      jockeys: Array.isArray(rest.jockeys) ? rest.jockeys : [],
      trainers: Array.isArray(rest.trainers) ? rest.trainers : [],
      postType: rest.postType || "topic",
      source: rest.source || "unknown",
      updatedAt: rest.updatedAt || rest.publishedAt || null,
      postCount: Number(rest.postCount) || 0,
      prevPostCount:
        rest.prevPostCount != null ? Number(rest.prevPostCount) : null,
      trendChangeRate:
        rest.trendChangeRate != null ? Number(rest.trendChangeRate) : null,
      importanceHint: rest.importanceHint || null,
      providerName: rest.providerName || null,
    };
  });
}

async function fetchJsonOptional(path) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const SocialRepository = { fetch: fetchSocialRaw };
