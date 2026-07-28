/* ========================================
   Draw Formatter — Ver7.7
   Analysis Stage 表示（Stage3〜5）
   ======================================== */

export function formatDrawStagePanel(stage = 0, completeness = null) {
  const s = Number(stage) || 0;
  return {
    stage: s,
    stageLabel: `Stage${s}`,
    title: "現在分析段階",
    mode: evaluationMode(s),
    acquired: acquiredDataForStage(s),
    pending: pendingDataForStage(s),
    provisional: s < 7,
    provisionalText:
      s >= 3 && s <= 5
        ? "現在は確定情報を反映した分析です。"
        : s < 3
          ? "現在は暫定分析です。"
          : s < 7
            ? "現在は確定情報を反映した分析です。"
            : "当日最終段階の評価です。",
    completeness,
  };
}

export function acquiredDataForStage(stage) {
  const s = Number(stage) || 0;
  if (s < 3) return ["登録馬", "出走予定馬"];
  if (s === 3) return ["枠順"];
  if (s === 4) return ["枠順", "騎手"];
  if (s === 5) return ["枠順", "騎手", "斤量"];
  if (s === 6) return ["枠順", "騎手", "斤量", "前日情報"];
  return ["枠順", "騎手", "斤量", "前日情報", "当日情報"];
}

export function pendingDataForStage(stage) {
  const s = Number(stage) || 0;
  if (s < 3) return ["枠順", "騎手", "斤量", "最新オッズ"];
  if (s === 3) return ["騎手", "斤量", "最新オッズ", "当日馬場"];
  if (s === 4) return ["斤量", "最新オッズ", "当日馬場"];
  if (s === 5) return ["最新オッズ", "当日馬場", "最終天候", "直前情報"];
  if (s === 6) return ["最新オッズ", "当日馬場", "最終天候"];
  return [];
}

function evaluationMode(stage) {
  const map = {
    0: "開催情報のみ",
    1: "登録馬情報のみ",
    2: "出走予定馬情報",
    3: "枠順確定",
    4: "騎手確定",
    5: "斤量確定",
    6: "前日情報",
    7: "最終AI分析",
  };
  return map[stage] || map[0];
}

export const DrawFormatter = {
  stagePanel: formatDrawStagePanel,
  acquired: acquiredDataForStage,
  pending: pendingDataForStage,
};
