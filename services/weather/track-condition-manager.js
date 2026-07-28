/* ========================================
   Track Condition Manager — Ver7.9
   Track / Weather / Surface Score
   ======================================== */

/**
 * AI 補助スコア（単独要因にしない前提で相対評価）
 */
export function analyzeTrackCondition(weather = {}) {
  const trackScore = computeTrackScore(weather);
  const weatherScore = computeWeatherScore(weather);
  const surfaceScore = computeSurfaceScore(weather);

  return {
    trackScore,
    weatherScore,
    surfaceScore,
    trackLabel: trackLabel(weather.trackCondition),
    weatherLabel: weatherLabel(weather.weather),
    surfaceLabel: surfaceLabel(weather),
    windLabel: windLabel(weather.windSpeed),
    moistureLabel: moistureLabel(weather),
    adjustments: buildAdjustmentHints(weather, {
      trackScore,
      weatherScore,
      surfaceScore,
    }),
  };
}

export function computeTrackScore(w = {}) {
  const map = { 良: 88, 稍重: 72, 重: 55, 不良: 38 };
  let score = map[w.trackCondition] ?? 70;
  if (w.moistureAvailable && w.moisture != null) {
    const m = Number(w.moisture);
    if (m >= 20) score -= 8;
    else if (m >= 15) score -= 4;
    else if (m <= 8) score += 2;
  }
  return clamp(score, 0, 100);
}

export function computeWeatherScore(w = {}) {
  const map = { 晴: 86, 晴れ: 86, 曇: 78, くもり: 78, 小雨: 62, 雨: 48, 雪: 35, 霧: 55 };
  let score = map[w.weather] ?? 70;
  const temp = Number(w.temperature);
  if (Number.isFinite(temp)) {
    if (temp >= 33 || temp <= 2) score -= 8;
    else if (temp >= 30 || temp <= 5) score -= 4;
  }
  const hum = Number(w.humidity);
  if (Number.isFinite(hum) && hum >= 85) score -= 5;
  return clamp(score, 0, 100);
}

export function computeSurfaceScore(w = {}) {
  const surface = w.surface || "芝";
  let score = surface === "ダート" ? 75 : 80;
  const cond = w.trackCondition || "良";
  if (surface === "芝") {
    if (cond === "良") score += 8;
    if (cond === "稍重") score -= 4;
    if (cond === "重" || cond === "不良") score -= 12;
  } else {
    if (cond === "稍重") score += 4;
    if (cond === "重") score += 2;
    if (cond === "不良") score -= 6;
  }
  const wind = Number(w.windSpeed);
  if (Number.isFinite(wind) && wind >= 8) score -= 6;
  else if (Number.isFinite(wind) && wind >= 5) score -= 3;
  return clamp(score, 0, 100);
}

function buildAdjustmentHints(w, scores) {
  const list = [];
  list.push({
    type: "weather",
    label: "天候補正",
    delta: scoreToDelta(scores.weatherScore),
  });
  list.push({
    type: "track",
    label: "馬場補正",
    delta: scoreToDelta(scores.trackScore),
  });
  if (w.windSpeed != null) {
    const ws = Number(w.windSpeed);
    list.push({
      type: "wind",
      label: "風補正",
      delta: ws >= 8 ? -2 : ws >= 5 ? -1 : 0,
    });
  }
  list.push({
    type: "surface",
    label: "芝／ダート補正",
    delta: scoreToDelta(scores.surfaceScore),
  });
  if (w.moistureAvailable && w.moisture != null) {
    const m = Number(w.moisture);
    list.push({
      type: "moisture",
      label: "含水率補正",
      delta: m >= 20 ? -2 : m >= 15 ? -1 : m <= 8 ? 1 : 0,
    });
  }
  return list;
}

function scoreToDelta(score) {
  if (score >= 85) return 1;
  if (score <= 45) return -2;
  if (score <= 60) return -1;
  return 0;
}

function trackLabel(c) {
  return c ? `馬場${c}` : "馬場情報なし";
}

function weatherLabel(w) {
  return w ? `天候${w}` : "天候情報なし";
}

function surfaceLabel(w) {
  return `${w.surface || "芝"}・${w.surfaceState || w.trackCondition || "—"}`;
}

function windLabel(speed) {
  const s = Number(speed);
  if (!Number.isFinite(s)) return "風情報なし";
  if (s >= 8) return "強風";
  if (s >= 5) return "やや強い風";
  return "穏やか";
}

function moistureLabel(w) {
  if (!w.moistureAvailable || w.moisture == null) return "含水率未取得";
  return `含水率${w.moisture}%`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export const TrackConditionManager = {
  analyze: analyzeTrackCondition,
  trackScore: computeTrackScore,
  weatherScore: computeWeatherScore,
  surfaceScore: computeSurfaceScore,
};
