/* ========================================
   News Categories — Ver8.0
   ======================================== */

export const NEWS_CATEGORY = {
  ENTRY: "entry",
  TRAINING: "training",
  COMMENT: "comment",
  SCRATCH: "scratch",
  JOCKEY: "jockey",
  TRACK: "track",
  MEETING: "meeting",
  OTHER: "other",
};

export const NEWS_CATEGORY_LABEL = {
  [NEWS_CATEGORY.ENTRY]: "出走関連",
  [NEWS_CATEGORY.TRAINING]: "調教関連",
  [NEWS_CATEGORY.COMMENT]: "コメント",
  [NEWS_CATEGORY.SCRATCH]: "取消情報",
  [NEWS_CATEGORY.JOCKEY]: "騎手情報",
  [NEWS_CATEGORY.TRACK]: "馬場関連",
  [NEWS_CATEGORY.MEETING]: "開催情報",
  [NEWS_CATEGORY.OTHER]: "その他",
};

export const NEWS_CATEGORY_SET = new Set(Object.values(NEWS_CATEGORY));

export function normalizeNewsCategory(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const map = {
    entry: NEWS_CATEGORY.ENTRY,
    出走: NEWS_CATEGORY.ENTRY,
    出走関連: NEWS_CATEGORY.ENTRY,
    training: NEWS_CATEGORY.TRAINING,
    調教: NEWS_CATEGORY.TRAINING,
    調教関連: NEWS_CATEGORY.TRAINING,
    comment: NEWS_CATEGORY.COMMENT,
    コメント: NEWS_CATEGORY.COMMENT,
    scratch: NEWS_CATEGORY.SCRATCH,
    scratched: NEWS_CATEGORY.SCRATCH,
    取消: NEWS_CATEGORY.SCRATCH,
    取消情報: NEWS_CATEGORY.SCRATCH,
    jockey: NEWS_CATEGORY.JOCKEY,
    騎手: NEWS_CATEGORY.JOCKEY,
    騎手情報: NEWS_CATEGORY.JOCKEY,
    track: NEWS_CATEGORY.TRACK,
    馬場: NEWS_CATEGORY.TRACK,
    馬場関連: NEWS_CATEGORY.TRACK,
    meeting: NEWS_CATEGORY.MEETING,
    開催: NEWS_CATEGORY.MEETING,
    開催情報: NEWS_CATEGORY.MEETING,
    other: NEWS_CATEGORY.OTHER,
    その他: NEWS_CATEGORY.OTHER,
  };
  return map[s] || NEWS_CATEGORY.OTHER;
}
