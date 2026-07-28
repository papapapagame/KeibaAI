/* ========================================
   Entry Validator — Ver7.6
   ======================================== */

import {
  ENTRY_STATUS_SET,
  normalizeEntryStatus,
  isRemovedEntry,
} from "./entry-status.js";

/**
 * 必須・重複・欠損・型・Entry Status 整合性
 * 異常データは AI へ渡さない
 */
export function validateEntries(entries = []) {
  const errors = [];
  const warnings = [];
  const seenNames = new Set();
  const seenNumbers = new Set();
  const sanitized = [];

  for (const raw of entries || []) {
    const name = raw.horseName || raw.horse || raw.name || "";
    const number = Number(raw.number);
    const status = normalizeEntryStatus(raw.entryStatus);

    if (!name) {
      errors.push({ code: "REQUIRED", message: "馬名必須欠損" });
      continue;
    }
    if (!Number.isFinite(number) || number <= 0) {
      errors.push({ code: "TYPE", message: `馬番型異常: ${raw.number}` });
      continue;
    }
    if (!ENTRY_STATUS_SET.has(status)) {
      errors.push({
        code: "STATUS",
        message: `Entry Status 不正: ${raw.entryStatus}`,
      });
      continue;
    }

    const nameKey = name.trim();
    if (seenNames.has(nameKey)) {
      errors.push({ code: "DUP", message: `馬名重複: ${nameKey}` });
      continue;
    }
    if (seenNumbers.has(number)) {
      errors.push({ code: "DUP", message: `馬番重複: ${number}` });
      continue;
    }
    seenNames.add(nameKey);
    seenNumbers.add(number);

    if (raw.age != null && (!Number.isFinite(Number(raw.age)) || Number(raw.age) < 2)) {
      warnings.push({ code: "RANGE", message: `年齢異常: ${name}` });
    }
    if (!raw.sex) {
      warnings.push({ code: "MISSING", message: `性別欠損: ${name}` });
    }
    if (!raw.trainer && !raw.trainerName) {
      warnings.push({ code: "MISSING", message: `調教師欠損: ${name}` });
    }

    // 取消・除外・回避は予想対象外として残すが AI フィルタで除外
    sanitized.push({
      ...raw,
      horseName: name,
      horse: name,
      number,
      entryStatus: status,
      _removed: isRemovedEntry(status),
    });
  }

  return {
    ok: errors.length === 0 && sanitized.length > 0,
    errors,
    warnings,
    sanitized,
  };
}

export const EntryValidator = { validate: validateEntries };
export const HorseEntryValidator = EntryValidator;
