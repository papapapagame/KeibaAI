/* ========================================
   Past meeting retention window
   過去開催は残すが、5週以上前は選択・閲覧不可
   ======================================== */

/** 閲覧・選択可能な過去開催の上限（週） */
export const PAST_MEETING_RETENTION_WEEKS = 5;

export function jstTodayIso(now = new Date()) {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

/** YYYY-MM-DD に日数を加算（暦日ベース / UTC日付演算） */
export function addDaysIso(dateIso = "", deltaDays = 0) {
  const d = String(dateIso || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  dt.setUTCDate(dt.getUTCDate() + Number(deltaDays || 0));
  return dt.toISOString().slice(0, 10);
}

/**
 * 選択・閲覧可能な最古日（今日から retentionWeeks 週前を含む）
 * これより前の日付は「5週以上前」として不可
 */
export function getRetentionCutoffIso(
  weeks = PAST_MEETING_RETENTION_WEEKS,
  todayIso = jstTodayIso()
) {
  const w = Math.max(0, Number(weeks) || 0);
  return addDaysIso(todayIso, -(w * 7));
}

export function isValidIsoDate(dateIso = "") {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(dateIso || "").slice(0, 10));
}

/** 保持期間内か（未来日も true。期限切れ過去日のみ false） */
export function isWithinRetentionWindow(
  dateIso = "",
  weeks = PAST_MEETING_RETENTION_WEEKS,
  todayIso = jstTodayIso()
) {
  const d = String(dateIso || "").slice(0, 10);
  if (!isValidIsoDate(d)) return false;
  const cutoff = getRetentionCutoffIso(weeks, todayIso);
  return Boolean(cutoff) && d >= cutoff;
}

export function retentionBlockedMessage(
  weeks = PAST_MEETING_RETENTION_WEEKS
) {
  return `${weeks}週以上前の開催は選択・閲覧できません`;
}

export const RetentionWindow = {
  weeks: PAST_MEETING_RETENTION_WEEKS,
  jstTodayIso,
  addDaysIso,
  getRetentionCutoffIso,
  isWithinRetentionWindow,
  retentionBlockedMessage,
};
