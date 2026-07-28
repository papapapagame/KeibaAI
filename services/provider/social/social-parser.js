/* ========================================
   SocialParser — Ver10.5
   投稿本文・画像・動画・コメントは破棄
   ======================================== */

export const SOCIAL_PARSER_VERSION = "10.5.0";

const BODY_KEYS = new Set([
  "body",
  "text",
  "content",
  "html",
  "post",
  "posts",
  "comment",
  "comments",
  "image",
  "images",
  "video",
  "videos",
  "media",
  "thumbnail",
  "caption",
]);

export function parseSocialRaw(raw = {}, providerId = "real-social") {
  if (!raw || typeof raw !== "object") {
    return {
      providerId,
      items: [],
      meta: {},
      parsedAt: new Date().toISOString(),
      version: SOCIAL_PARSER_VERSION,
      empty: true,
    };
  }

  const list = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.social)
      ? raw.social
      : [];

  const items = list.map((entry, index) => {
    const src = entry && typeof entry === "object" ? entry : {};
    const cleaned = {};
    for (const [k, v] of Object.entries(src)) {
      if (BODY_KEYS.has(k)) continue;
      cleaned[k] = v;
    }
    return {
      id: cleaned.id || cleaned.socialId || `rs_${index + 1}`,
      publishedAt: cleaned.publishedAt || cleaned.published || null,
      updatedAt: cleaned.updatedAt || cleaned.publishedAt || null,
      topicKey: cleaned.topicKey || cleaned.topic || null,
      category: cleaned.category || "other",
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
      postType: cleaned.postType || "topic",
      source: cleaned.source || cleaned.infoSource || "unknown",
      postCount: Number(cleaned.postCount) || 0,
      prevPostCount:
        cleaned.prevPostCount != null ? Number(cleaned.prevPostCount) : null,
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
    version: SOCIAL_PARSER_VERSION,
    empty: items.length === 0,
  };
}

export const SocialParser = {
  parse: parseSocialRaw,
  version: SOCIAL_PARSER_VERSION,
};
