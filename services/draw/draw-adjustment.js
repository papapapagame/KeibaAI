/* ========================================
   Draw Adjustment — Ver7.7
   確定情報のみ補正。未確定は推測しない。
   ai-engine / thinking-engine は変更しない。
   ======================================== */

/**
 * Entry 馬へ Draw 確定情報をマージ
 */
export function mergeDrawOntoHorses(horses = [], draws = [], stage = 0) {
  const s = Number(stage) || 0;
  const map = new Map((draws || []).map((d) => [Number(d.number), d]));

  return (horses || [])
    .map((h) => {
      const d = map.get(Number(h.number));
      if (!d) return { ...h };

      const out = { ...h };
      out.scratched = Boolean(d.scratched) || Boolean(h.scratched);
      out.excluded = Boolean(d.excluded) || Boolean(h.excluded);

      // Stage3+: 枠・馬番（確定時のみ）
      if (s >= 3 && d.frameConfirmed && d.frame > 0) {
        out.frame = d.frame;
        out.number = d.number;
        out._frameUnconfirmed = false;
        out._numberUnconfirmed = false;
        out._entryAwaitingConfirm = false;
        out._entryProvisional = false;
        out.frameConfirmed = true;
      }

      // Stage4+: 騎手
      if (s >= 4 && d.jockeyConfirmed && d.jockey && d.jockey !== "未定") {
        out.jockey = d.jockey;
        out._jockeyUnconfirmed = false;
        out.jockeyConfirmed = true;
        out.riderChanged = Boolean(d.riderChanged);
        out.previousJockey = d.previousJockey || null;
      }

      // Stage5+: 斤量
      if (s >= 5 && d.weightConfirmed && Number.isFinite(Number(d.weight))) {
        out.weight = Number(d.weight);
        out._weightUnconfirmed = false;
        out.weightConfirmed = true;
      }

      // オッズは常に未確定（Ver7.7）
      out._oddsUnconfirmed = true;

      out._drawAdjustments = buildAdjustments(out, d, s);
      return out;
    })
    .filter((h) => {
      // 取消・除外は AI へ渡さない
      if (h.scratched || h.excluded) return false;
      return true;
    });
}

/**
 * 補正ラベル（表示・説明用）。スコア本体は AI エンジンに確定値を渡して反映。
 */
export function buildAdjustments(horse, draw, stage = 0) {
  const s = Number(stage) || 0;
  const list = [];

  if (draw.scratched) {
    list.push({ type: "scratch", label: "出走取消補正", delta: 0 });
    return list;
  }
  if (draw.excluded) {
    list.push({ type: "exclude", label: "競走除外補正", delta: 0 });
    return list;
  }

  if (s >= 3 && draw.frameConfirmed && draw.frame > 0) {
    if (draw.frame >= 7) {
      list.push({ type: "frame", label: "枠順補正（外枠）", delta: -2 });
    } else if (draw.frame <= 2) {
      list.push({ type: "frame", label: "枠順補正（内枠）", delta: 1 });
    } else {
      list.push({ type: "frame", label: "枠順補正", delta: 0 });
    }
  }

  if (s >= 4 && draw.jockeyConfirmed) {
    list.push({ type: "jockey", label: "騎手補正", delta: 0 });
    if (draw.riderChanged) {
      list.push({ type: "rider_change", label: "乗り替わり補正", delta: -1 });
    }
  }

  if (s >= 5 && draw.weightConfirmed) {
    const w = Number(draw.weight);
    if (w >= 57) {
      list.push({ type: "weight", label: "斤量補正（増）", delta: -1 });
    } else if (w <= 53) {
      list.push({ type: "weight", label: "斤量補正（減）", delta: 1 });
    } else {
      list.push({ type: "weight", label: "斤量補正", delta: 0 });
    }
  }

  return list;
}

/**
 * analyzeRace 後の表示スコアへ軽微補正（エンジン非改変）
 * 確定補正のみ適用
 */
export function applyDrawScoreAdjustments(ranked = [], stage = 0) {
  const s = Number(stage) || 0;
  if (s < 3) return ranked;

  return (ranked || []).map((h) => {
    const adj = h._drawAdjustments || [];
    const delta = adj.reduce((sum, a) => sum + (Number(a.delta) || 0), 0);
    if (!delta) return h;

    const next = { ...h };
    if (next.thinking && typeof next.thinking.score === "number") {
      next.thinking = {
        ...next.thinking,
        score: Math.max(0, Math.min(100, next.thinking.score + delta)),
        drawAdjustments: adj,
      };
    }
    if (next.indexes && typeof next.indexes.total === "number") {
      next.indexes = {
        ...next.indexes,
        total: Math.max(0, Math.min(100, next.indexes.total + delta)),
      };
    }
    next.drawAdjustmentNote = adj.map((a) => a.label).join(" / ");
    return next;
  });
}

export const DrawAdjustment = {
  merge: mergeDrawOntoHorses,
  build: buildAdjustments,
  applyScores: applyDrawScoreAdjustments,
};
