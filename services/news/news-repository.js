/* ========================================
   News Repository — Ver8.0
   Metadata only (no body/images/SNS)
   ======================================== */

import { acquireBundle } from "../provider/index.js";
import { getSourceMode } from "../data/source-mode.js";
import { API_BASE_URL } from "../../js/config.js";

export async function fetchNewsRaw(options = {}) {
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
      acquired.raw?.news || acquired.data?.news || acquired.raw?.items || [];
    return {
      ok: true,
      blocked: false,
      message: "Real News via Framework",
      providerId: acquired.providerId,
      mode,
      items: stripBodies(rawItems),
      provenance: acquired.provenance,
      framework: acquired.framework,
    };
  }

  try {
    const newsJson = await fetchJsonOptional("news/mock-news.json");
    const items = stripBodies(newsJson?.items || []);
    return {
      ok: true,
      blocked: false,
      message: "Mock News Repository",
      providerId: "mock",
      mode,
      items,
      meta: {
        raceDate: options.date || newsJson?.raceDate || null,
        venueId: options.venueId || newsJson?.venueId || null,
        raceNumber: options.raceNumber || newsJson?.raceNumber || null,
        updatedAt: newsJson?.updatedAt || new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      ok: false,
      blocked: false,
      message: err?.message || "News fetch failed",
      providerId: "mock",
      mode,
      items: [],
    };
  }
}

/** 本文・画像・SNSを破棄（保存禁止） */
function stripBodies(items = []) {
  return (items || []).map((raw) => {
    const {
      body: _b,
      content: _c,
      text: _t,
      html: _h,
      image: _i,
      images: _is,
      thumbnail: _th,
      sns: _sns,
      post: _p,
      posts: _ps,
      ...rest
    } = raw || {};
    return {
      id: rest.id || null,
      publishedAt: rest.publishedAt || rest.published || null,
      title: rest.title || "",
      category: rest.category || "other",
      raceNumber: rest.raceNumber ?? rest.race ?? null,
      venueId: rest.venueId || rest.venue || null,
      horses: Array.isArray(rest.horses) ? rest.horses : [],
      jockeys: Array.isArray(rest.jockeys) ? rest.jockeys : [],
      trainers: Array.isArray(rest.trainers) ? rest.trainers : [],
      source: rest.source || "unknown",
      updatedAt: rest.updatedAt || rest.publishedAt || null,
      updateCount: Number(rest.updateCount) || 1,
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

export const NewsRepository = { fetch: fetchNewsRaw };
