/* ========================================
   PAPAPA IQ KEIBA - Intelligence Models
   Ver5.1 + Ver5.2 Real Intelligence Connect
   ======================================== */

export function createHorse(raw = {}) {
  return {
    id: raw.id || raw.number || null,
    number: Number(raw.number) || 0,
    name: raw.name || raw.horse || "",
    sexAge: raw.sexAge || "",
    weight: raw.weight != null ? Number(raw.weight) : null,
    jockey: raw.jockey || "",
    trainer: raw.trainer || "",
    affiliation: raw.affiliation || "",
    odds: raw.odds != null ? Number(raw.odds) : null,
    popularity: raw.popularity != null ? Number(raw.popularity) : null,
    frame: raw.frame != null ? Number(raw.frame) : null,
    runningStyle: raw.runningStyle || "",
    source: raw.source || "unknown",
  };
}

export function createRace(raw = {}) {
  return {
    id: raw.id || `${raw.date || ""}-${raw.venue || ""}-${raw.number || ""}`,
    date: raw.date || "",
    venue: raw.venue || "",
    venueLabel: raw.venueLabel || "",
    number: Number(raw.number) || 0,
    name: raw.name || "",
    time: raw.time || "",
    grade: raw.grade || "",
    distance: raw.distance != null ? Number(raw.distance) : null,
    track: raw.track || "",
    condition: raw.condition || raw.trackCondition || "",
    weather: raw.weather || "",
    source: raw.source || "unknown",
  };
}

export function createOdds(raw = {}) {
  return {
    raceId: raw.raceId || "",
    horseNumber: Number(raw.horseNumber) || 0,
    win: raw.win != null ? Number(raw.win) : null,
    place: raw.place != null ? Number(raw.place) : null,
    updatedAt: raw.updatedAt || null,
    source: raw.source || "unknown",
  };
}

export function createHistory(raw = {}) {
  return {
    horseNumber: raw.horseNumber != null ? Number(raw.horseNumber) : null,
    horseName: raw.horseName || "",
    finish: raw.finish != null ? Number(raw.finish) : null,
    distance: raw.distance != null ? Number(raw.distance) : null,
    time: raw.time || "",
    last3f: raw.last3f || "",
    venue: raw.venue || "",
    className: raw.className || "",
    track: raw.track || "",
    source: raw.source || "unknown",
  };
}

export function createTrack(raw = {}) {
  return {
    venue: raw.venue || "",
    venueLabel: raw.venueLabel || "",
    surface: raw.surface || raw.track || "",
    condition: raw.condition || "",
    courseDirection: raw.courseDirection || "",
    source: raw.source || "unknown",
  };
}

export function createWeather(raw = {}) {
  return {
    condition: raw.condition || raw.weather || "",
    temperature: raw.temperature != null ? Number(raw.temperature) : null,
    observedAt: raw.observedAt || null,
    source: raw.source || "unknown",
  };
}

export function createNews(raw = {}) {
  return {
    id: raw.id || "",
    title: raw.title || "",
    body: raw.body || "",
    url: raw.url || "",
    publishedAt: raw.publishedAt || null,
    category: raw.category || "general",
    source: raw.source || "news",
    aiOnly: true,
  };
}

export function createComment(raw = {}) {
  return {
    id: raw.id || "",
    author: raw.author || "",
    text: raw.text || "",
    targetType: raw.targetType || "race",
    targetName: raw.targetName || "",
    publishedAt: raw.publishedAt || null,
    source: raw.source || "unknown",
    aiOnly: true,
  };
}

export function createTrend(raw = {}) {
  return {
    keyword: raw.keyword || "",
    volume: Number(raw.volume) || 0,
    direction: raw.direction || "flat",
    score: Number(raw.score) || 0,
    source: raw.source || "unknown",
    aiOnly: true,
  };
}

export function createSentiment(raw = {}) {
  return {
    subject: raw.subject || "",
    polarity: Number(raw.polarity) || 0,
    confidence: Number(raw.confidence) || 0,
    labels: Array.isArray(raw.labels) ? raw.labels : [],
    source: raw.source || "unknown",
    aiOnly: true,
  };
}

export function createAnalysis(raw = {}) {
  return {
    raceId: raw.raceId || "",
    summary: raw.summary || "",
    scores: raw.scores || {},
    signals: Array.isArray(raw.signals) ? raw.signals : [],
    sources: Array.isArray(raw.sources) ? raw.sources : [],
    generatedAt: raw.generatedAt || new Date().toISOString(),
    aiOnly: true,
  };
}
