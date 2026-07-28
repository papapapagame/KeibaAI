/* ========================================
   Stage-aware provisional evaluation — Ver7.1
   ai-engine / thinking-engine は変更しない
   未確定情報を確定として渡さないよう入力を整形
   ======================================== */

import {
  createAnalysisStage,
  createDataCompleteness,
  stageConfidence,
  ANALYSIS_STAGES,
} from "./models.js";

/**
 * Analysis Stage に応じて race/horses をサニタイズ
 * Ver7.6: Entry Status 連携 + 枠/騎手/斤量/オッズは Stage3未満で確定扱いにしない
 */
export function sanitizeForStage(race, horses, stage) {
  const s = createAnalysisStage(stage).stage;
  const raceOut = { ...race };
  let horseOut = (horses || []).map((h) => ({ ...h }));

  // Stage0: 開催情報のみ — 馬データは渡さない
  if (s < 1) {
    horseOut = [];
    raceOut.trackCondition = "未確定";
    raceOut.weather = "未確定";
  }

  // Stage1: 登録馬のみ
  if (s === 1) {
    horseOut = horseOut
      .filter((h) => !h.entryStatus || h.entryStatus === "registered")
      .slice(0, Math.min(horseOut.length, 18))
      .map((h) =>
        stripUnconfirmed(h, {
          frame: true,
          jockey: true,
          weight: true,
          odds: true,
        })
      );
    raceOut.trackCondition = "未確定";
    raceOut.weather = "未確定";
  }

  // Stage2: 出走予定馬 — 枠・騎手・斤量・オッズは未確定
  if (s === 2) {
    horseOut = horseOut
      .filter(
        (h) =>
          !h.entryStatus ||
          h.entryStatus === "entry_expected" ||
          h.entryStatus === "planned"
      )
      .filter((h) => !isRemovedStatus(h.entryStatus))
      .map((h) =>
        stripUnconfirmed(h, { frame: true, jockey: true, weight: true, odds: true })
      );
    raceOut.trackCondition = "未確定";
    raceOut.weather = "未確定";
  }

  // Stage3+: 取消・除外・回避を除外。枠順以降は段階的に解除（既存）
  if (s >= 3) {
    horseOut = horseOut.filter((h) => !isRemovedStatus(h.entryStatus));
  }

  // Stage3: 枠順確定 — 騎手・斤量・オッズ未確定
  if (s === 3) {
    horseOut = horseOut.map((h) =>
      stripUnconfirmed(h, { jockey: true, weight: true, odds: true })
    );
    raceOut.trackCondition = "未確定";
    raceOut.weather = "未確定";
  }

  // Stage4: 騎手確定 — 斤量・最終オッズ・馬場未確定
  if (s === 4) {
    horseOut = horseOut.map((h) =>
      stripUnconfirmed(h, { weight: true, odds: true })
    );
    raceOut.trackCondition = "未確定";
    raceOut.weather = "未確定";
  }

  // Stage5: 斤量確定 — 当日馬場・最終オッズ・気象は未確定
  if (s === 5) {
    horseOut = horseOut.map((h) => stripUnconfirmed(h, { odds: true }));
    raceOut.trackCondition = "未確定";
    raceOut.weather = "未確定";
  }

  // Stage6: 前日情報 — 当日馬場・最終オッズ・気象は暫定のまま扱わない
  if (s === 6) {
    raceOut.trackCondition = raceOut.trackCondition
      ? `${raceOut.trackCondition}（前日時点）`
      : "前日時点・当日未確定";
    raceOut.weather = raceOut.weather
      ? `${raceOut.weather}（予報）`
      : "予報・当日未確定";
    horseOut = horseOut.map((h) => ({
      ...h,
      odds: h.odds,
      _oddsProvisional: true,
    }));
  }

  // Stage7: 最終 — そのまま（確定扱い可）

  // Ver7.6: Entry Engine 由来の未確定フラグは Stage に関わらず確定扱いしない
  horseOut = horseOut.map((h) => {
    if (
      !h._frameUnconfirmed &&
      !h._jockeyUnconfirmed &&
      !h._weightUnconfirmed &&
      !h._oddsUnconfirmed &&
      !h._entryProvisional &&
      !h._entryAwaitingConfirm
    ) {
      return h;
    }
    return stripUnconfirmed(h, {
      frame: Boolean(h._frameUnconfirmed || h._entryProvisional || h._entryAwaitingConfirm),
      jockey: Boolean(h._jockeyUnconfirmed || h._entryProvisional || h._entryAwaitingConfirm),
      weight: Boolean(h._weightUnconfirmed || h._entryProvisional || h._entryAwaitingConfirm),
      odds: Boolean(h._oddsUnconfirmed || h._entryProvisional || h._entryAwaitingConfirm),
    });
  });

  return {
    race: raceOut,
    horses: horseOut,
    stage: createAnalysisStage(s),
    evaluationMode: evaluationModeLabel(s),
  };
}

function isRemovedStatus(status) {
  return (
    status === "scratched" ||
    status === "excluded" ||
    status === "withdrawn"
  );
}

function stripUnconfirmed(horse, flags = {}) {
  const h = { ...horse };
  if (flags.frame) {
    h.frame = 0;
    h._frameUnconfirmed = true;
  }
  if (flags.jockey) {
    h.jockey = "未定";
    h._jockeyUnconfirmed = true;
  }
  if (flags.weight) {
    // 未確定を確定斤量として扱わない（中立プレースホルダ）
    h.weight = 55;
    h._weightUnconfirmed = true;
  }
  if (flags.odds) {
    h.odds = 99.9;
    h.popularity = 99;
    h._oddsUnconfirmed = true;
  }
  return h;
}

function evaluationModeLabel(stage) {
  const map = {
    0: "開催情報のみ分析",
    1: "登録馬を反映（暫定）",
    2: "出走予定馬を反映（暫定）",
    3: "枠順補正追加（暫定）",
    4: "騎手補正追加（暫定）",
    5: "斤量補正追加（暫定）",
    6: "前日情報反映（暫定）",
    7: "最終AI分析",
  };
  return map[stage] || map[0];
}

/**
 * UI / AI通知用のステージコンテキスト
 */
export function buildStageContext(stage) {
  const analysisStage = createAnalysisStage(stage);
  const completeness = createDataCompleteness(analysisStage.stage);
  const confidence = stageConfidence(
    analysisStage.stage,
    completeness.percent
  );

  return {
    analysisStage,
    completeness,
    confidence: {
      percent: confidence,
      label: `${confidence}%`,
    },
    notice: {
      title: `現在分析段階 Stage${analysisStage.stage}`,
      confirmed: analysisStage.confirmedLabel,
      pending: completeness.pendingFields,
      provisional:
        analysisStage.isProvisional
          ? "この予想は暫定評価です。"
          : "当日最終段階の評価です。",
      mode: evaluationModeLabel(analysisStage.stage),
      note: completeness.note,
    },
    stages: ANALYSIS_STAGES,
  };
}

export const StageEvaluation = {
  sanitizeForStage,
  buildStageContext,
};
