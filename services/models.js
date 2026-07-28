/* ========================================
   PAPAPA IQ KEIBA - services/models.js
   Ver5.1 統一データモデル
   ======================================== */

/**
 * 馬データ統一モデル
 * AIエンジン互換のため legacy フィールド (horse, last3 等) も併記する
 */
export function createHorseModel(raw = {}) {
  const number = Number(raw.number) || 0;
  const horseName = raw.horseName || raw.horse || "";
  const lastResults = normalizeResults(raw.lastResults || raw.last3);

  return {
    horseId: raw.horseId || `H${String(number).padStart(2, "0")}`,
    horseName,
    frame: Number(raw.frame) || 0,
    number,
    jockey: raw.jockey || "",
    trainer: raw.trainer || "",
    weight: Number(raw.weight) || 55,
    odds: Number(raw.odds) || 10,
    popularity: Number(raw.popularity) || 99,
    sex: raw.sex || "",
    age: Number(raw.age) || 0,
    weightChange: Number(raw.weightChange) || 0,
    runningStyle: raw.runningStyle || "差し",
    lastResults,
    score: raw.score != null ? Number(raw.score) : Number(raw.stars) || 0,

    // --- AIエンジン互換（既存ロジック変更なし） ---
    horse: horseName,
    last3: lastResults,
    lastRace: raw.lastRace || "",
    favorite: Boolean(raw.favorite),
    trackType: raw.trackType || "",
    distanceType: raw.distanceType || "",
    winRate: Number(raw.winRate) || 0,
    placeRate: Number(raw.placeRate) || 0,
    grade: raw.grade || "",
    stars: Number(raw.stars) || Number(raw.score) || 0,
  };
}

/**
 * レース統一モデル
 * AIエンジン互換のため venue / venueLabel / track 等も併記する
 */
export function createRaceModel(raw = {}, horses = []) {
  const number = Number(raw.number || raw.raceNumber) || 0;
  const course = raw.course || raw.venueLabel || raw.venue || "";
  const surface = raw.surface || raw.track || "芝";
  const horseModels = (horses || []).map((h) => createHorseModel(h));

  return {
    raceId:
      raw.raceId ||
      `${raw.date || "nodate"}_${raw.venue || "venue"}_${number}`,
    course,
    raceName: raw.raceName || raw.name || "",
    distance: Number(raw.distance) || 0,
    surface,
    weather: raw.weather || "",
    trackCondition: raw.trackCondition || "良",
    startTime: raw.startTime || raw.time || "",
    horses: horseModels,

    // --- AIエンジン互換 ---
    date: raw.date || "",
    venue: raw.venue || "",
    venueLabel: raw.venueLabel || course,
    number,
    name: raw.raceName || raw.name || "",
    time: raw.startTime || raw.time || "",
    track: surface,
    courseDirection: raw.courseDirection || "",
    fieldSize: Number(raw.fieldSize) || horseModels.length,
    pacePrediction: raw.pacePrediction || "",
    grade: raw.grade || "",
  };
}

export function toLegacyHorses(horseModels = []) {
  return horseModels.map((h) => ({ ...h }));
}

export function toLegacyRace(raceModel) {
  if (!raceModel) return {};
  const { horses, ...race } = raceModel;
  void horses;
  return { ...race };
}

function normalizeResults(value) {
  if (Array.isArray(value)) return value.map((n) => Number(n) || 0);
  return [];
}
