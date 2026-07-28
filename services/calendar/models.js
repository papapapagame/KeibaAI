/* ========================================
   Unified Calendar Models — Ver7.1
   ======================================== */

export const CALENDAR_MODEL_VERSION = "7.1.0";

export const ANALYSIS_STAGES = [
  { stage: 0, code: "MEETING", label: "開催決定", short: "開催決定" },
  { stage: 1, code: "ENTRY", label: "特別登録", short: "特別登録" },
  { stage: 2, code: "RUNNERS", label: "出走予定馬", short: "出走予定" },
  { stage: 3, code: "FRAME", label: "枠順確定", short: "枠順確定" },
  { stage: 4, code: "JOCKEY", label: "騎手確定", short: "騎手確定" },
  { stage: 5, code: "WEIGHT", label: "斤量確定", short: "斤量確定" },
  { stage: 6, code: "EVE", label: "前日情報", short: "前日情報" },
  { stage: 7, code: "FINAL", label: "当日最終分析", short: "最終分析" },
];

export function createRaceDate(raw = {}) {
  return {
    date: String(raw.date || ""),
    label: raw.label || formatDateLabel(raw.date),
    isMeetingDay: Boolean(raw.isMeetingDay),
    venueCount: Number(raw.venueCount) || 0,
  };
}

export function createRaceVenue(raw = {}) {
  return {
    venueId: raw.venueId || raw.value || "",
    label: raw.label || "",
    kai: Number(raw.kai) || 0,
    day: Number(raw.day) || 0,
    totalDays: Number(raw.totalDays) || 0,
    isFinalDay: Boolean(raw.isFinalDay),
    division: raw.division || "",
    status: raw.status || "scheduled",
    defaultStage: clampStage(raw.defaultStage),
  };
}

export function createRaceSession(raw = {}) {
  const venue = createRaceVenue(raw.venue || raw);
  return {
    sessionId:
      raw.sessionId ||
      `${raw.date || ""}|${venue.venueId}|${venue.kai}-${venue.day}`,
    date: String(raw.date || ""),
    venue,
    kaiLabel: venue.kai ? `${venue.kai}回` : "—",
    dayLabel: venue.day ? `${venue.day}日目` : "—",
    finalDayLabel: venue.isFinalDay ? "開催最終日" : "",
    divisionLabel: venue.division || "—",
    statusLabel: statusLabel(venue.status),
    analysisStage: createAnalysisStage(raw.analysisStage ?? venue.defaultStage),
  };
}

export function createAnalysisStage(stageOrRaw) {
  const stage =
    typeof stageOrRaw === "object"
      ? clampStage(stageOrRaw.stage)
      : clampStage(stageOrRaw);
  const meta = ANALYSIS_STAGES.find((s) => s.stage === stage) || ANALYSIS_STAGES[0];
  return {
    stage: meta.stage,
    code: meta.code,
    label: meta.label,
    short: meta.short,
    confirmedLabel: `【${meta.short}済】`,
    isProvisional: meta.stage < 7,
  };
}

export function createDataCompleteness(stage, extras = {}) {
  const s = clampStage(stage);
  // 段階ごとのベース充足率（未確定情報は確定扱いにしない）
  const base = [12, 24, 38, 52, 68, 78, 88, 100][s] ?? 12;
  const value = Math.max(0, Math.min(100, Math.round(base + (extras.bonus || 0))));
  return {
    percent: value,
    label: `${value}%`,
    note: s < 7
      ? "※現時点で取得済み情報に基づく分析です。"
      : "当日最終情報までの充足を想定した分析です。",
    confirmedFields: confirmedFieldsForStage(s),
    pendingFields: pendingFieldsForStage(s),
  };
}

export function stageConfidence(stage, completenessPercent) {
  const s = clampStage(stage);
  const base = [20, 32, 45, 58, 72, 82, 90, 96][s] ?? 20;
  const c = Math.round(base * 0.7 + (completenessPercent || 0) * 0.3);
  return Math.max(5, Math.min(99, c));
}

export function clampStage(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(7, Math.round(n)));
}

function confirmedFieldsForStage(stage) {
  const map = {
    0: ["開催日", "開催場"],
    1: ["開催日", "開催場", "特別登録馬"],
    2: ["開催日", "開催場", "出走予定馬"],
    3: ["開催日", "開催場", "出走予定馬", "枠順"],
    4: ["開催日", "開催場", "出走予定馬", "枠順", "騎手"],
    5: ["開催日", "開催場", "出走予定馬", "枠順", "騎手", "斤量"],
    6: ["開催日", "開催場", "出走予定馬", "枠順", "騎手", "斤量", "前日情報"],
    7: [
      "開催日",
      "開催場",
      "出走馬",
      "枠順",
      "騎手",
      "斤量",
      "前日情報",
      "当日情報",
    ],
  };
  return map[stage] || map[0];
}

function pendingFieldsForStage(stage) {
  if (stage >= 7) return [];
  const pending = [];
  if (stage < 1) pending.push("特別登録");
  if (stage < 2) pending.push("出走予定馬");
  if (stage < 3) pending.push("枠順");
  if (stage < 4) pending.push("騎手");
  if (stage < 5) pending.push("斤量");
  if (stage < 6) pending.push("前日情報");
  pending.push("馬場状態", "最終オッズ", "当日気象");
  return [...new Set(pending)];
}

function statusLabel(status) {
  const map = {
    open: "開催中",
    scheduled: "開催予定",
    upcoming: "今後の開催",
    closed: "開催終了",
  };
  return map[status] || status || "—";
}

function formatDateLabel(date) {
  if (!date) return "";
  const [y, m, d] = String(date).split("-");
  if (!y || !m || !d) return String(date);
  return `${y}/${m}/${d}`;
}
