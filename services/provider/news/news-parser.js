/* ========================================
   NewsParser — Ver10.4
   本文・画像はパース対象外（破棄）
   ======================================== */

export const NEWS_PARSER_VERSION = "10.4.0";

const BODY_KEYS = new Set([
  "body",
  "content",
  "text",
  "html",
  "image",
  "images",
  "thumbnail",
  "sns",
  "post",
  "posts",
  "article",
  "fullText",
  "full_text",
]);

export function parseNewsRaw(raw = {}, providerId = "real-news") {
  if (!raw || typeof raw !== "object") {
    return {
      providerId,
      items: [],
      meta: {},
      parsedAt: new Date().toISOString(),
      version: NEWS_PARSER_VERSION,
      empty: true,
    };
  }

  const list = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.news)
      ? raw.news
      : [];

  const items = list.map((entry, index) => {
    const src = entry && typeof entry === "object" ? entry : {};
    const cleaned = {};
    for (const [k, v] of Object.entries(src)) {
      if (BODY_KEYS.has(k)) continue;
      cleaned[k] = v;
    }
    return {
      id: cleaned.id || cleaned.newsId || `rn_${index + 1}`,
      title: cleaned.title || "",
      publishedAt: cleaned.publishedAt || cleaned.published || null,
      updatedAt: cleaned.updatedAt || cleaned.publishedAt || null,
      raceNumber:
        cleaned.raceNumber != null
          ? Number(cleaned.raceNumber)
          : cleaned.race != null
            ? Number(cleaned.race)
            : null,
      venueId: cleaned.venueId || cleaned.venue || null,
      horses: Array.isArray(cleaned.horses) ? cleaned.horses : [],
      jockeys: Array.isArray(cleaned.jockeys) ? cleaned.jockeys : [],
      trainers: Array.isArray(cleaned.trainers) ? cleaned.trainers : [],
      category: cleaned.category || "other",
      source: cleaned.source || cleaned.infoSource || "unknown",
      updateCount: Number(cleaned.updateCount) || 1,
      importanceHint: cleaned.importanceHint || null,
      providerName:
        cleaned.providerName || raw.providerName || providerId,
    };
  });

  return {
    providerId,
    items,
    meta: {
      raceDate: raw.raceDate || raw.date || null,
      venueId: raw.venueId || raw.venue || null,
      raceNumber: raw.raceNumber != null ? Number(raw.raceNumber) : null,
      updatedAt: raw.updatedAt || null,
      fetchedAt: raw.fetchedAt || null,
      source: raw.source || "real",
      providerName: raw.providerName || providerId,
      note: raw.note || "Metadata only",
    },
    parsedAt: new Date().toISOString(),
    version: NEWS_PARSER_VERSION,
    empty: items.length === 0,
  };
}

export const NewsParser = {
  parse: parseNewsRaw,
  version: NEWS_PARSER_VERSION,
};
