/* ========================================
   Social Categories — Ver8.1
   ======================================== */

export const SOCIAL_CATEGORY = {
  TRAINING: "training",
  BODY: "body",
  JOCKEY: "jockey",
  PADDOCK: "paddock",
  SCRATCH: "scratch",
  POPULARITY: "popularity",
  MEETING: "meeting",
  OTHER: "other",
};

export const SOCIAL_CATEGORY_LABEL = {
  [SOCIAL_CATEGORY.TRAINING]: "調教話題",
  [SOCIAL_CATEGORY.BODY]: "馬体話題",
  [SOCIAL_CATEGORY.JOCKEY]: "騎手話題",
  [SOCIAL_CATEGORY.PADDOCK]: "パドック話題",
  [SOCIAL_CATEGORY.SCRATCH]: "取消話題",
  [SOCIAL_CATEGORY.POPULARITY]: "人気話題",
  [SOCIAL_CATEGORY.MEETING]: "開催話題",
  [SOCIAL_CATEGORY.OTHER]: "その他",
};

export const SOCIAL_CATEGORY_SET = new Set(Object.values(SOCIAL_CATEGORY));

export function normalizeSocialCategory(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const map = {
    training: SOCIAL_CATEGORY.TRAINING,
    調教: SOCIAL_CATEGORY.TRAINING,
    調教話題: SOCIAL_CATEGORY.TRAINING,
    body: SOCIAL_CATEGORY.BODY,
    馬体: SOCIAL_CATEGORY.BODY,
    馬体話題: SOCIAL_CATEGORY.BODY,
    jockey: SOCIAL_CATEGORY.JOCKEY,
    騎手: SOCIAL_CATEGORY.JOCKEY,
    騎手話題: SOCIAL_CATEGORY.JOCKEY,
    paddock: SOCIAL_CATEGORY.PADDOCK,
    パドック: SOCIAL_CATEGORY.PADDOCK,
    パドック話題: SOCIAL_CATEGORY.PADDOCK,
    scratch: SOCIAL_CATEGORY.SCRATCH,
    取消: SOCIAL_CATEGORY.SCRATCH,
    取消話題: SOCIAL_CATEGORY.SCRATCH,
    popularity: SOCIAL_CATEGORY.POPULARITY,
    人気: SOCIAL_CATEGORY.POPULARITY,
    人気話題: SOCIAL_CATEGORY.POPULARITY,
    meeting: SOCIAL_CATEGORY.MEETING,
    開催: SOCIAL_CATEGORY.MEETING,
    開催話題: SOCIAL_CATEGORY.MEETING,
    other: SOCIAL_CATEGORY.OTHER,
    その他: SOCIAL_CATEGORY.OTHER,
  };
  return map[s] || SOCIAL_CATEGORY.OTHER;
}
