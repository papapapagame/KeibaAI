/* ========================================
   Draw Validator — Ver7.7
   ======================================== */

/**
 * 枠番重複・馬番重複・騎手重複・斤量異常・取消整合性
 * 異常データは AI へ渡さない
 */
export function validateDraws(items = []) {
  const errors = [];
  const warnings = [];
  const sanitized = [];
  const seenNumbers = new Set();
  const seenFramesPairs = new Set();
  const jockeyCounts = new Map();

  for (const raw of items || []) {
    const number = Number(raw.number);
    const frame = Number(raw.frame);
    const scratched = Boolean(raw.scratched);
    const excluded = Boolean(raw.excluded);
    const removed = scratched || excluded;

    if (!Number.isFinite(number) || number <= 0) {
      errors.push({ code: "TYPE", message: `馬番型異常: ${raw.number}` });
      continue;
    }
    if (seenNumbers.has(number)) {
      errors.push({ code: "DUP", message: `馬番重複: ${number}` });
      continue;
    }
    seenNumbers.add(number);

    if (!removed) {
      if (!Number.isFinite(frame) || frame < 1 || frame > 8) {
        errors.push({ code: "FRAME", message: `枠番異常: ${number}番` });
        continue;
      }
      const pair = `${frame}:${number}`;
      if (seenFramesPairs.has(pair)) {
        errors.push({ code: "DUP", message: `枠・馬番組重複: ${pair}` });
        continue;
      }
      seenFramesPairs.add(pair);

      const jockey = String(raw.jockey || "").trim();
      if (raw.jockeyConfirmed && (!jockey || jockey === "未定")) {
        errors.push({ code: "JOCKEY", message: `騎手未設定: ${number}番` });
        continue;
      }
      if (jockey && jockey !== "未定") {
        jockeyCounts.set(jockey, (jockeyCounts.get(jockey) || 0) + 1);
      }

      const weight = Number(raw.weight);
      if (raw.weightConfirmed) {
        if (!Number.isFinite(weight) || weight < 48 || weight > 63) {
          errors.push({
            code: "WEIGHT",
            message: `斤量異常値: ${number}番 (${raw.weight})`,
          });
          continue;
        }
      }
    } else {
      // 取消・除外は騎手・斤量未確定でも可。確定フラグ整合性チェック
      if (scratched && excluded) {
        errors.push({
          code: "STATUS",
          message: `取消と除外の同時指定: ${number}番`,
        });
        continue;
      }
    }

    sanitized.push({
      ...raw,
      number,
      frame: Number.isFinite(frame) ? frame : 0,
      horse: raw.horse || raw.horseName || "",
      jockey: raw.jockey || null,
      weight: raw.weight != null ? Number(raw.weight) : null,
      scratched,
      excluded,
      riderChanged: Boolean(raw.riderChanged),
      previousJockey: raw.previousJockey || null,
      frameConfirmed: Boolean(raw.frameConfirmed) && !removed
        ? Number.isFinite(frame) && frame > 0
        : Boolean(raw.frameConfirmed),
      jockeyConfirmed:
        Boolean(raw.jockeyConfirmed) &&
        !removed &&
        Boolean(raw.jockey) &&
        raw.jockey !== "未定",
      weightConfirmed:
        Boolean(raw.weightConfirmed) &&
        !removed &&
        Number.isFinite(Number(raw.weight)),
      jockeyHistory: Array.isArray(raw.jockeyHistory) ? raw.jockeyHistory : [],
      weightHistory: Array.isArray(raw.weightHistory) ? raw.weightHistory : [],
    });
  }

  for (const [jockey, count] of jockeyCounts) {
    if (count > 1) {
      warnings.push({
        code: "JOCKEY_DUP",
        message: `騎手重複: ${jockey} (${count}頭)`,
      });
    }
  }

  return {
    ok: errors.length === 0 && sanitized.length > 0,
    errors,
    warnings,
    sanitized,
  };
}

export const DrawValidator = { validate: validateDraws };
