/* ========================================
   News Repository — Ver8.0 / Ver10.4
   Metadata only (no body/images/SNS)
   ======================================== */

import { API_BASE_URL } from "../../js/config.js";
import { getNewsMode } from "./news-mode.js";
import { loadRealNews } from "../provider/news/index.js";

export async function fetchNewsRaw(options = {}) {
  const newsMode = options.newsMode || getNewsMode();

  // Ver10.4 Real News（自動 Mock フォールバックなし）
  if (newsMode === "real") {
    const real = await loadRealNews({
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
        providerId: real.providerId || "real-news",
        mode: "real",
        items: [],
        validation: real.validation,
        error: real.error || null,
      };
    }
    return {
      ok: true,
      blocked: false,
      message: real.message || "Real News",
      providerId: real.providerId || "real-news",
      providerName: real.providerName || "Real News",
      mode: "real",
      items: stripBodies(real.items || real.news || []),
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
      aggregate: real.aggregate,
      newsModels: real.newsModels,
      provenance: { providerId: real.providerId, source: "real-news" },
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
      providerName: "Mock News",
      mode: "mock",
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
      userMessage: "ニュース情報を取得できませんでした",
      providerId: "mock",
      mode: "mock",
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
      article: _a,
      fullText: _ft,
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
      providerName: rest.providerName || null,
      freshnessScore: rest.freshnessScore ?? null,
      importanceScore: rest.importanceScore ?? null,
      reliabilityScore: rest.reliabilityScore ?? null,
      coverageScore: rest.coverageScore ?? null,
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
