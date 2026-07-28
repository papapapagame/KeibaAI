/* ========================================
   HorseEntryValidator — Ver10.1
   馬番/枠番重複・騎手欠損・斤量異常・必須項目
   ======================================== */

import {
  ENTRY_STATUS_SET,
  normalizeEntryStatus,
  isRemovedEntry,
} from "../../entry/entry-status.js";

export const HORSE_ENTRY_VALIDATOR_VERSION = "10.1.0";

/**
 * Validation 失敗データは採用しない
 */
export function validateHorseEntries(parsed = {}) {
  const errors = [];
  const warnings = [];
  const entries = parsed.entries || [];
  const seenNumbers = new Set();
  const seenFramesActive = new Map(); // frame -> numbers (active only soft warn)
  const accepted = [];

  if (!entries.length) {
    errors.push({ code: "EMPTY", message: "出馬表が空です" });
  }

  for (const raw of entries) {
    const rowErrors = [];
    const name = raw.horseName || raw.horse || "";
    const number = Number(raw.number);
    const status = normalizeEntryStatus(raw.entryStatus);
    const frame = raw.frame != null ? Number(raw.frame) : null;
    const weight =
      raw.weight != null
        ? Number(raw.weight)
        : raw.carriedWeight != null
          ? Number(raw.carriedWeight)
          : null;

    if (!name) {
      rowErrors.push({ code: "REQUIRED", message: "馬名必須欠損" });
    }
    if (!Number.isFinite(number) || number <= 0) {
      rowErrors.push({
        code: "REQUIRED",
        message: `馬番必須/異常: ${raw.number}`,
      });
    }
    if (!ENTRY_STATUS_SET.has(status)) {
      rowErrors.push({
        code: "STATUS",
        message: `出走状態不正: ${raw.entryStatus}`,
      });
    }
    if (seenNumbers.has(number)) {
      rowErrors.push({ code: "DUP_NUMBER", message: `馬番重複: ${number}` });
    }
    if (Number.isFinite(number)) seenNumbers.add(number);

    if (frame != null) {
      if (!Number.isFinite(frame) || frame < 1 || frame > 8) {
        rowErrors.push({
          code: "BAD_FRAME",
          message: `枠番異常: ${name || number} → ${frame}`,
        });
      } else if (!isRemovedEntry(status)) {
        const list = seenFramesActive.get(frame) || [];
        list.push(number);
        seenFramesActive.set(frame, list);
      }
    }

    if (!isRemovedEntry(status) && !raw.jockey) {
      rowErrors.push({
        code: "JOCKEY_MISSING",
        message: `騎手欠損: ${name || number}`,
      });
    }

    if (weight != null) {
      if (!Number.isFinite(weight) || weight < 48 || weight > 65) {
        rowErrors.push({
          code: "BAD_WEIGHT",
          message: `斤量異常: ${name || number} → ${weight}`,
        });
      }
    }

    if (!raw.trainer) {
      warnings.push({
        code: "TRAINER_MISSING",
        message: `調教師欠損: ${name || number}`,
      });
    }
    if (!raw.sex) {
      warnings.push({
        code: "SEX_MISSING",
        message: `性齢(性)欠損: ${name || number}`,
      });
    }

    if (rowErrors.length) {
      errors.push(...rowErrors);
      continue;
    }

    accepted.push({
      ...raw,
      horseName: name,
      horse: name,
      number,
      entryStatus: status,
      frame: Number.isFinite(frame) ? frame : null,
      weight: Number.isFinite(weight) ? weight : null,
      carriedWeight:
        raw.carriedWeight != null
          ? Number(raw.carriedWeight)
          : Number.isFinite(weight)
            ? weight
            : null,
      _removed: isRemovedEntry(status),
    });
  }

  // 同一枠の過密は警告（採用は継続）
  for (const [frame, nums] of seenFramesActive) {
    if (nums.length > 2) {
      warnings.push({
        code: "FRAME_CROWD",
        message: `枠${frame}に ${nums.length}頭`,
      });
    }
  }

  return {
    ok: errors.length === 0 && accepted.length > 0,
    errors,
    warnings,
    acceptedEntries: accepted,
    rejectedCount: entries.length - accepted.length,
    version: HORSE_ENTRY_VALIDATOR_VERSION,
  };
}

export const HorseEntryValidator = {
  validate: validateHorseEntries,
  version: HORSE_ENTRY_VALIDATOR_VERSION,
};
