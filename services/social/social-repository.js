/* ========================================
   Social Repository — Ver8.1
   Metadata only (no body/images/videos)
   ======================================== */

import { acquireBundle } from "../provider/index.js";
import { getSourceMode } from "../data/source-mode.js";
import { API_BASE_URL } from "../../js/config.js";

export async function fetchSocialRaw(options = {}) {
  const mode = options.mode || getSourceMode();

  if (mode === "real") {
    const acquired = await acquireBundle({ ...options, mode: "real" });
    if (!acquired.ok) {
      return {
        ok: false,
        blocked: true,
        message: acquired.message || "Provider未接続",
        providerId: acquired.providerId || "real",
        mode,
        items: [],
      };
    }
    const rawItems =
      acquired.raw?.social ||
      acquired.data?.social ||
      acquired.raw?.items ||
      [];
    return {
      ok: true,
      blocked: false,
      message: "Real Social via Framework",
      providerId: acquired.providerId,
      mode,
      items: stripBodies(rawItems),
      provenance: acquired.provenance,
      framework: acquired.framework,
    };
  }

  try {
    const socialJson = await fetchJsonOptional("social/mock-social.json");
    return {
      ok: true,
      blocked: false,
      message: "Mock Social Repository",
      providerId: "mock",
      mode,
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
      providerId: "mock",
      mode,
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
      importanceHint: rest.importanceHint || null,
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
