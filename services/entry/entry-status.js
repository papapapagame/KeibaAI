/* ========================================
   Entry Status — Ver7.6
   Registered / Entry Expected / Confirmed /
   Scratched / Excluded / Withdrawn
   ======================================== */

export const ENTRY_STATUS = {
  REGISTERED: "registered",
  ENTRY_EXPECTED: "entry_expected", // Entry Expected（出走予定）
  CONFIRMED: "confirmed",
  SCRATCHED: "scratched",
  EXCLUDED: "excluded",
  WITHDRAWN: "withdrawn",
};

/** 後方互換エイリアス */
ENTRY_STATUS.PLANNED = ENTRY_STATUS.ENTRY_EXPECTED;

export const ENTRY_STATUS_LABEL = {
  [ENTRY_STATUS.REGISTERED]: "Registered（登録）",
  [ENTRY_STATUS.ENTRY_EXPECTED]: "Entry Expected（出走予定）",
  [ENTRY_STATUS.CONFIRMED]: "Confirmed（出走確定）",
  [ENTRY_STATUS.SCRATCHED]: "Scratched（取消）",
  [ENTRY_STATUS.EXCLUDED]: "Excluded（除外）",
  [ENTRY_STATUS.WITHDRAWN]: "Withdrawn（回避）",
};

export const ENTRY_STATUS_SET = new Set([
  ENTRY_STATUS.REGISTERED,
  ENTRY_STATUS.ENTRY_EXPECTED,
  ENTRY_STATUS.CONFIRMED,
  ENTRY_STATUS.SCRATCHED,
  ENTRY_STATUS.EXCLUDED,
  ENTRY_STATUS.WITHDRAWN,
]);

/** 本バージョンで確定情報として扱わない項目 */
export const UNCONFIRMED_FIELDS = [
  "frame",
  "number",
  "jockey",
  "weight",
  "odds",
  "popularity",
];

export function isActiveEntry(status) {
  return (
    status === ENTRY_STATUS.REGISTERED ||
    status === ENTRY_STATUS.ENTRY_EXPECTED ||
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
    .toLowerCase()
    .replace(/\s+/g, "_");
  const map = {
    registered: ENTRY_STATUS.REGISTERED,
    登録: ENTRY_STATUS.REGISTERED,
    entry_expected: ENTRY_STATUS.ENTRY_EXPECTED,
    entryexpected: ENTRY_STATUS.ENTRY_EXPECTED,
    planned: ENTRY_STATUS.ENTRY_EXPECTED,
    出走予定: ENTRY_STATUS.ENTRY_EXPECTED,
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

export const HorseEntryStatus = EntryStatus;
