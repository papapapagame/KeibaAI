/* ========================================
   Unified Data Model — Ver7.3 正式版
   全AIはこのモデルのみを参照する
   ======================================== */

export const UNIFIED_VERSION = "7.3.0";

export function createVenue(raw = {}) {
  return {
    venueId: raw.venueId || raw.value || raw.venue || "",
    label: raw.label || raw.venueLabel || "",
    kai: Number(raw.kai) || 0,
    day: Number(raw.day) || 0,
  };
}

export function createDistance(raw) {
  if (typeof raw === "number") return { meters: raw, label: `${raw}m` };
  const meters = Number(raw?.meters ?? raw?.distance ?? raw) || 0;
  return { meters, label: meters ? `${meters}m` : "" };
}

export function createSurface(raw) {
  const value = String(raw?.value ?? raw?.surface ?? raw?.track ?? raw ?? "芝");
  return { value, label: value };
}

export function createFrame(raw) {
  return { frame: Number(raw?.frame ?? raw) || 0 };
}

export function createWeight(raw) {
  const kg = Number(raw?.kg ?? raw?.weight ?? raw);
  return {
    kg: Number.isFinite(kg) ? kg : null,
    confirmed: raw?.confirmed !== false && Number.isFinite(kg),
  };
}

export function createOdds(raw = {}) {
  const win = Number(raw.win ?? raw.odds);
  return {
    win: Number.isFinite(win) ? win : null,
    place: Number.isFinite(Number(raw.place)) ? Number(raw.place) : null,
    confirmed: raw.confirmed !== false && Number.isFinite(win),
    updatedAt: raw.updatedAt || null,
  };
}

export function createPopularity(raw) {
  const value = Number(raw?.value ?? raw?.popularity ?? raw);
  return {
    value: Number.isFinite(value) ? value : null,
    confirmed: raw?.confirmed !== false && Number.isFinite(value),
  };
}

export function createResult(raw = {}) {
  return {
    finish: raw.finish != null ? Number(raw.finish) : null,
    time: raw.time || "",
    margin: raw.margin || "",
    last3f: raw.last3f != null ? Number(raw.last3f) : null,
  };
}

export function createJockey(raw = {}) {
  if (typeof raw === "string") {
    return { jockeyId: null, name: raw, winRate: null, placeRate: null };
  }
  return {
    jockeyId: raw.jockeyId || raw.id || null,
    name: raw.name || raw.jockey || "",
    winRate: raw.winRate != null ? Number(raw.winRate) : null,
    placeRate: raw.placeRate != null ? Number(raw.placeRate) : null,
    confirmed: raw.confirmed !== false && Boolean(raw.name || raw.jockey),
  };
}

export function createTrainer(raw = {}) {
  if (typeof raw === "string") {
    return { trainerId: null, name: raw, winRate: null, placeRate: null };
  }
  return {
    trainerId: raw.trainerId || raw.id || null,
    name: raw.name || raw.trainer || "",
    winRate: raw.winRate != null ? Number(raw.winRate) : null,
    placeRate: raw.placeRate != null ? Number(raw.placeRate) : null,
    confirmed: raw.confirmed !== false && Boolean(raw.name || raw.trainer),
  };
}

export function createAnalysisStageRef(stage = 0) {
  return { stage: Number(stage) || 0 };
}

export function createLearningDataRef(raw = {}) {
  return { learningId: raw.learningId || raw.id || null, hit: raw.hit ?? null };
}

export function createKnowledgeRef(raw = {}) {
  return {
    knowledgeId: raw.knowledgeId || raw.id || null,
    horseId: raw.horseId || null,
  };
}

export function createReviewRef(raw = {}) {
  return { reviewId: raw.reviewId || raw.id || null, summary: raw.summary || "" };
}

export function createHorse(raw = {}) {
  const number = Number(raw.number) || 0;
  const name = raw.horseName || raw.horse || raw.name || "";
  const jockey = createJockey(raw.jockey);
  const trainer = createTrainer(raw.trainer);
  const odds = createOdds(
    typeof raw.odds === "object" ? raw.odds : { win: raw.odds, popularity: raw.popularity }
  );
  const popularity = createPopularity(
    raw.popularity != null ? { value: raw.popularity } : {}
  );

  return {
    modelVersion: UNIFIED_VERSION,
    horseId: raw.horseId || raw.id || `H${String(number).padStart(2, "0")}`,
    horseName: name,
    age: raw.age != null ? Number(raw.age) : null,
    sex: raw.sex || "",
    frame: createFrame(raw.frame),
    number,
    weight: createWeight(raw.weight),
    jockey,
    trainer,
    runningStyle: raw.runningStyle || "",
    odds,
    popularity,
    history: Array.isArray(raw.history)
      ? raw.history
      : Array.isArray(raw.last3)
        ? raw.last3.map((f) => ({ finish: f }))
        : [],
    lastRace: raw.lastRace || "",
    condition: raw.condition || raw.conditionMark || "",
    winRate: Number(raw.winRate) || 0,
    placeRate: Number(raw.placeRate) || 0,
    grade: raw.grade || "",
    stars: Number(raw.stars || raw.score) || 0,
    result: raw.result ? createResult(raw.result) : null,
    // AIエンジン互換
    horse: name,
    last3: Array.isArray(raw.last3)
      ? raw.last3
      : (raw.history || []).map((h) => h.finish).filter((n) => n != null),
    favorite: Boolean(raw.favorite),
    trackType: raw.trackType || "",
    distanceType: raw.distanceType || "",
  };
}

export function createRace(raw = {}, horses = []) {
  const number = Number(raw.number || raw.raceNumber) || 0;
  const surface = createSurface(raw.surface || raw.track);
  const distance = createDistance(raw.distance);
  const venue = createVenue(raw);
  const horseModels = (horses || []).map((h) => createHorse(h));

  return {
    modelVersion: UNIFIED_VERSION,
    raceId:
      raw.raceId ||
      `${raw.date || "nodate"}_${venue.venueId || "venue"}_${number}`,
    date: raw.date || "",
    venue,
    kai: Number(raw.kai || venue.kai) || 0,
    day: Number(raw.day || venue.day) || 0,
    number,
    raceName: raw.raceName || raw.name || "",
    distance,
    surface,
    surfaceDistance: `${surface.value}${distance.meters || ""}m`,
    weather: raw.weather || "",
    trackCondition: raw.trackCondition || "",
    startTime: raw.startTime || raw.time || "",
    courseDirection: raw.courseDirection || "",
    fieldSize: Number(raw.fieldSize) || horseModels.length,
    pacePrediction: raw.pacePrediction || "",
    grade: raw.grade || "",
    horses: horseModels,
    analysisStage: createAnalysisStageRef(raw.analysisStage ?? raw.stage),
    learning: raw.learning ? createLearningDataRef(raw.learning) : null,
    knowledge: raw.knowledge ? createKnowledgeRef(raw.knowledge) : null,
    review: raw.review ? createReviewRef(raw.review) : null,
    // AIエンジン互換
    name: raw.raceName || raw.name || "",
    time: raw.startTime || raw.time || "",
    track: surface.value,
    venueLabel: venue.label || raw.venueLabel || "",
    venueId: venue.venueId,
  };
}

/** AIエンジン向けレガシー平坦化 */
export function toLegacyHorse(h) {
  return {
    ...h,
    horse: h.horseName || h.horse,
    jockey: typeof h.jockey === "object" ? h.jockey.name : h.jockey,
    trainer: typeof h.trainer === "object" ? h.trainer.name : h.trainer,
    weight: typeof h.weight === "object" ? h.weight.kg : h.weight,
    odds: typeof h.odds === "object" ? h.odds.win : h.odds,
    popularity:
      typeof h.popularity === "object" ? h.popularity.value : h.popularity,
    frame: typeof h.frame === "object" ? h.frame.frame : h.frame,
    last3: h.last3 || [],
  };
}

export function toLegacyRace(r) {
  return {
    ...r,
    track: r.surface?.value || r.track,
    distance: r.distance?.meters || r.distance,
    venue: r.venue?.venueId || r.venueId || r.venue,
    venueLabel: r.venue?.label || r.venueLabel,
    name: r.raceName || r.name,
    time: r.startTime || r.time,
  };
}
