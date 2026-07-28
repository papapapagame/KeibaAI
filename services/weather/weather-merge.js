/* ========================================
   Weather Merge / Completeness / Formatter
   Ver7.9
   ======================================== */

export function computeWeatherCompleteness(weather = null) {
  if (!weather) {
    return {
      weather: 0,
      track: 0,
      wind: 0,
      moisture: 0,
      news: 0,
      sns: 0,
      overall: 0,
      note: "天候・馬場未取得",
    };
  }

  const weatherPct = weather.weather ? 100 : 0;
  const trackPct = weather.trackCondition ? 100 : 0;
  const windPct =
    weather.windSpeed != null && weather.windDirection
      ? 100
      : weather.windSpeed != null || weather.windDirection
        ? 50
        : 0;
  const moisturePct = weather.moistureAvailable
    ? weather.moisture != null
      ? 100
      : 50
    : 80; // Provider未対応時は取得不可として 80% 扱い（必須ではない）
  const news = 0;
  const sns = 0;
  const scored = [weatherPct, trackPct, windPct, moisturePct, news, sns];
  const overall = Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);

  return {
    weather: weatherPct,
    track: trackPct,
    wind: windPct,
    moisture: moisturePct,
    news,
    sns,
    overall,
    note: "ニュース・SNS・レース後は未取得（天候・馬場のみ）",
  };
}

export function confidenceFromWeatherCompleteness(baseConfidence, completeness) {
  const base = Number(baseConfidence);
  const overall = Number(completeness?.overall);
  if (!Number.isFinite(base) || !Number.isFinite(overall)) return base || null;
  return Math.max(5, Math.min(99, Math.round(base * 0.5 + overall * 0.5)));
}

export function formatWeatherStagePanel(stage = 0, completeness = null) {
  const s = Number(stage) || 0;
  return {
    stage: s,
    stageLabel: `Stage${s}`,
    title: "現在分析段階",
    mode:
      s >= 7
        ? "当日最新天候・馬場"
        : s >= 6
          ? "前日天候・馬場"
          : "天候・馬場待機",
    acquired:
      s >= 6
        ? ["天候", "馬場状態", "風", "気象情報"]
        : ["枠順", "騎手", "斤量", "オッズ"],
    pending:
      s >= 6
        ? ["ニュース", "SNS", "レース後レビュー"]
        : ["天候", "馬場状態", "風"],
    provisional: s < 7,
    provisionalText:
      s >= 7
        ? "当日最新の天候・馬場を反映した分析です。"
        : s >= 6
          ? "前日の天候・馬場を反映した分析です。"
          : "天候・馬場未反映の暫定分析です。",
    completeness,
  };
}

/**
 * Stage6+: レースへ天候・馬場をマージ（推測補完しない）
 */
export function mergeWeatherOntoRace(race = {}, weatherBundle, stage = 0) {
  const s = Number(stage) || 0;
  if (s < 6 || !weatherBundle?.ok || !weatherBundle.weather) {
    return { ...race };
  }
  const w = weatherBundle.weather;
  const intel = weatherBundle.trackIntel || {};
  return {
    ...race,
    weather: w.weather,
    trackCondition: w.trackCondition,
    temperature: w.temperature,
    humidity: w.humidity,
    windSpeed: w.windSpeed,
    windDirection: w.windDirection,
    moisture: w.moistureAvailable ? w.moisture : null,
    surfaceState: w.surfaceState,
    track: race.track || w.surface || race.surface,
    weatherConfirmed: true,
    trackConfirmed: true,
    _weatherProvisional: s === 6,
    trackScore: intel.trackScore,
    weatherScore: intel.weatherScore,
    surfaceScore: intel.surfaceScore,
    weatherAdjustments: intel.adjustments || [],
  };
}

/**
 * 馬へ補助注釈（単独過大評価しない軽い補正）
 */
export function applyWeatherTrackAdjustments(ranked = [], race = {}, stage = 0) {
  const s = Number(stage) || 0;
  if (s < 6 || !race?.weatherConfirmed) return ranked;

  const adj = race.weatherAdjustments || [];
  const delta = adj.reduce((sum, a) => sum + (Number(a.delta) || 0), 0);
  // 統合評価: 合計を ±2 にクリップ（単独要因化を防ぐ）
  const clipped = Math.max(-2, Math.min(2, delta));

  return (ranked || []).map((h) => {
    const next = {
      ...h,
      weatherNote: (adj.map((a) => a.label).join(" / ")) || null,
      trackScore: race.trackScore,
      weatherScore: race.weatherScore,
      surfaceScore: race.surfaceScore,
    };
    if (!clipped) return next;
    if (next.thinking && typeof next.thinking.score === "number") {
      next.thinking = {
        ...next.thinking,
        score: Math.max(0, Math.min(100, next.thinking.score + clipped)),
        weatherAux: { delta: clipped, adjustments: adj },
      };
    }
    if (next.indexes && typeof next.indexes.total === "number") {
      next.indexes = {
        ...next.indexes,
        total: Math.max(0, Math.min(100, next.indexes.total + clipped)),
      };
    }
    return next;
  });
}

export const WeatherCompleteness = {
  compute: computeWeatherCompleteness,
  blendConfidence: confidenceFromWeatherCompleteness,
};

export const WeatherFormatter = {
  stagePanel: formatWeatherStagePanel,
};

export const WeatherMerge = {
  mergeRace: mergeWeatherOntoRace,
  applyScores: applyWeatherTrackAdjustments,
};
