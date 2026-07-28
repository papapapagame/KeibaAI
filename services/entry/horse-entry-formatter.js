/* ========================================
   Horse Entry Formatter — Ver7.6
   AI表示・Stage説明用
   ======================================== */

import { ENTRY_STATUS, ENTRY_STATUS_LABEL } from "./entry-status.js";

export function formatEntryStagePanel(stage = 0, completeness = null) {
  const s = Number(stage) || 0;
  return {
    stage: s,
    stageLabel: `Stage${s}`,
    title: "現在分析中",
    mode: evaluationMode(s),
    using: usingDataForStage(s),
    pending: pendingDataForStage(s),
    provisional: s < 7,
    provisionalText: s < 7 ? "現在は暫定分析です。" : "当日最終段階の評価です。",
    completeness,
  };
}

export function usingDataForStage(stage) {
  const s = Number(stage) || 0;
  if (s < 1) return ["開催日", "開催場"];
  if (s === 1) return ["登録馬", "過去成績", "距離実績"];
  if (s === 2) {
    return ["登録馬", "出走予定馬", "過去成績", "距離実績", "調教師"];
  }
  return ["登録馬", "出走予定馬", "過去成績", "距離実績", "調教師", "馬場実績"];
}

export function pendingDataForStage(stage) {
  const s = Number(stage) || 0;
  if (s < 3) return ["枠順", "騎手", "斤量", "オッズ"];
  if (s === 3) return ["騎手", "斤量", "オッズ"];
  if (s === 4) return ["斤量", "オッズ"];
  if (s === 5) return ["オッズ", "当日馬場"];
  if (s === 6) return ["当日馬場", "最終オッズ"];
  return [];
}

function evaluationMode(stage) {
  const map = {
    0: "開催情報のみ",
    1: "登録馬情報のみ利用",
    2: "出走予定馬情報を利用",
    3: "枠順確定待ち（暫定）",
    4: "騎手確定待ち（暫定）",
    5: "斤量確定待ち（暫定）",
    6: "前日情報（暫定）",
    7: "最終AI分析",
  };
  return map[stage] || map[0];
}

export function formatEntryStatusCounts(stats = {}) {
  return {
    registered: stats.registered ?? 0,
    entryExpected: stats.entryExpected ?? stats.planned ?? 0,
    confirmed: stats.confirmed ?? 0,
    scratched: stats.scratched ?? 0,
    excluded: stats.excluded ?? 0,
    withdrawn: stats.withdrawn ?? 0,
  };
}

export function formatEntryLabel(status) {
  return ENTRY_STATUS_LABEL[status] || status || "—";
}

export function formatEntrySummaryLine(entry) {
  if (!entry) return "";
  const parts = [
    entry.horseName || entry.horse,
    entry.sex,
    entry.age != null ? `${entry.age}歳` : null,
    entry.affiliation,
    entry.trainer,
    formatEntryLabel(entry.entryStatus),
  ].filter(Boolean);
  return parts.join(" · ");
}

export const HorseEntryFormatter = {
  stagePanel: formatEntryStagePanel,
  usingData: usingDataForStage,
  pendingData: pendingDataForStage,
  statusCounts: formatEntryStatusCounts,
  label: formatEntryLabel,
  summary: formatEntrySummaryLine,
  STATUS: ENTRY_STATUS,
};
