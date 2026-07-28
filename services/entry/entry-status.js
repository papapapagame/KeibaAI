/* ========================================
   Entry Status — Ver7.6
   ======================================== */

export const ENTRY_STATUS = {
  REGISTERED: "registered", // Registered / 登録
  PLANNED: "planned", // 出走予定
  CONFIRMED: "confirmed", // 出走確定
  SCRATCHED: "scratched", // 取消
  EXCLUDED: "excluded", // 除外
  WITHDRAWN: "withdrawn", // 回避
};

export const ENTRY_STATUS_LABEL = {
  [ENTRY_STATUS.REGISTERED]: "Registered（登録）",
  [ENTRY_STATUS.PLANNED]: "出走予定",
  [ENTRY_STATUS.CONFIRMED]: "出走確定",
  [ENTRY_STATUS.SCRATCHED]: "取消",
  [ENTRY_STATUS.EXCLUDED]: "除外",
  [ENTRY_STATUS.WITHDRAWN]: "回避",
};

export const ENTRY_STATUS_SET = new Set(Object.values(ENTRY_STATUS));

/** 枠・騎手・斤量・オッズは Ver7.6 では未確定扱い（確定情報として利用しない） */
export const UNCONFIRMED_FIELDS = ["frame", "jockey", "weight", "odds", "popularity"];

export function isActiveEntry(status) {
  return (
    status === ENTRY_STATUS.REGISTERED ||
    status === ENTRY_STATUS.PLANNED ||
    status === ENTRY_STATUS.CONFIRMED
  );
}

export function isRemovedEntry(status) {
  return (
    status === ENTRY_STATUS.SCRATCHED ||
    status === ENTRY_STATUS.EXCLUDED ||
    status === ENTRY_STATUS.WITHDRAWN
  );
}

export function normalizeEntryStatus(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  const map = {
    registered: ENTRY_STATUS.REGISTERED,
    登録: ENTRY_STATUS.REGISTERED,
    planned: ENTRY_STATUS.PLANNED,
    出走予定: ENTRY_STATUS.PLANNED,
    confirmed: ENTRY_STATUS.CONFIRMED,
    出走確定: ENTRY_STATUS.CONFIRMED,
    scratched: ENTRY_STATUS.SCRATCHED,
    取消: ENTRY_STATUS.SCRATCHED,
    出走取消: ENTRY_STATUS.SCRATCHED,
    excluded: ENTRY_STATUS.EXCLUDED,
    除外: ENTRY_STATUS.EXCLUDED,
    withdrawn: ENTRY_STATUS.WITHDRAWN,
    回避: ENTRY_STATUS.WITHDRAWN,
  };
  return map[s] || ENTRY_STATUS.REGISTERED;
}

export const EntryStatus = {
  ...ENTRY_STATUS,
  LABEL: ENTRY_STATUS_LABEL,
  normalize: normalizeEntryStatus,
  isActive: isActiveEntry,
  isRemoved: isRemovedEntry,
  UNCONFIRMED_FIELDS,
};
