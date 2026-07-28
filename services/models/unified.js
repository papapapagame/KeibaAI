/* ========================================
   Unified Data Model — Ver7.3 正式版
   全AIはこのモデルのみを参照する
   ======================================== */

export const UNIFIED_VERSION = "10.5.0";

/** Ver10.3 Weather — 天候 Unified Model */
export function createWeather(raw = {}) {
  return {
    modelVersion: UNIFIED_VERSION,
    weather: raw.weather || "",
    temperature:
      raw.temperature != null && Number.isFinite(Number(raw.temperature))
        ? Number(raw.temperature)
        : null,
    humidity:
      raw.humidity != null && Number.isFinite(Number(raw.humidity))
        ? Number(raw.humidity)
        : null,
    windSpeed:
      raw.windSpeed != null && Number.isFinite(Number(raw.windSpeed))
        ? Number(raw.windSpeed)
        : null,
    windDirection: raw.windDirection || null,
    precipitation:
      raw.precipitation != null && Number.isFinite(Number(raw.precipitation))
        ? Number(raw.precipitation)
        : null,
    precipitationAvailable: Boolean(
      raw.precipitationAvailable ||
        (raw.precipitation != null &&
          Number.isFinite(Number(raw.precipitation)))
    ),
    weatherScore:
      raw.weatherScore != null ? Number(raw.weatherScore) : null,
    updatedAt: raw.updatedAt || null,
    providerName: raw.providerName || null,
    source: raw.source || "unknown",
  };
}

/** Ver10.3 Track — 馬場 Unified Model */
export function createTrack(raw = {}) {
  return {
    modelVersion: UNIFIED_VERSION,
    trackCondition: raw.trackCondition || "",
    surface: raw.surface || raw.track || "芝",
    surfaceState: raw.surfaceState || null,
    turfCondition: raw.turfCondition || null,
    dirtCondition: raw.dirtCondition || null,
    moisture:
      raw.moisture != null && Number.isFinite(Number(raw.moisture))
        ? Number(raw.moisture)
        : null,
    moistureAvailable: Boolean(
      raw.moistureAvailable ||
        (raw.moisture != null && Number.isFinite(Number(raw.moisture)))
    ),
    trackScore: raw.trackScore != null ? Number(raw.trackScore) : null,
    surfaceScore:
      raw.surfaceScore != null ? Number(raw.surfaceScore) : null,
    updatedAt: raw.updatedAt || null,
    source: raw.source || "unknown",
  };
}

export function createVenue(raw = {}) {
  return {
    venueId: raw.venueId || raw.value || raw.venue || "",
    label: raw.label || raw.venueLabel || "",
    kai: Number(raw.kai) || 0,
    day: Number(raw.day) || 0,
    totalDays: Number(raw.totalDays) || 0,
    isFinalDay: Boolean(raw.isFinalDay),
    division: raw.division || "",
    status: raw.status || "",
  };
}

/** Ver10.0 Schedule — 開催日×開催場のスケジュール単位 */
export function createSchedule(raw = {}) {
  const venue = createVenue(raw.venue || raw);
  const stage = createAnalysisStageRef(
    raw.analysisStage ?? raw.stage ?? venue.defaultStage
  );
  return {
    modelVersion: UNIFIED_VERSION,
    scheduleId:
      raw.scheduleId ||
      `${raw.date || ""}|${venue.venueId}|${venue.kai}-${venue.day}`,
    date: String(raw.date || ""),
    venue,
    kai: Number(raw.kai ?? venue.kai) || 0,
    day: Number(raw.day ?? venue.day) || 0,
    totalDays: Number(raw.totalDays ?? venue.totalDays) || 0,
    isFinalDay:
      raw.isFinalDay != null ? Boolean(raw.isFinalDay) : Boolean(venue.isFinalDay),
    status: raw.status || venue.status || "scheduled",
    raceCount: Number(raw.raceCount) || 0,
    analysisStage: stage,
  };
}

/** Ver10.0 Calendar — 開催カレンダー統合モデル */
export function createCalendar(raw = {}) {
  const meetings = Array.isArray(raw.meetings) ? raw.meetings : [];
  const venues = Array.isArray(raw.venues)
    ? raw.venues.map((v) => createVenue(v))
    : [];
  const schedules = Array.isArray(raw.schedules)
    ? raw.schedules.map((s) => createSchedule(s))
    : [];
  const races = Array.isArray(raw.races) ? raw.races : [];
  return {
    modelVersion: UNIFIED_VERSION,
    source: raw.source || "unknown",
    providerId: raw.providerId || null,
    updatedAt: raw.updatedAt || null,
    meetings,
    venues,
    schedules,
    races,
    meetingCount: meetings.length,
    venueCount: venues.length,
    raceCount: races.length,
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
  const src = raw && typeof raw === "object" ? raw : {};
  const win = Number(src.win ?? (typeof raw === "number" ? raw : src.odds));
  return {
    win: Number.isFinite(win) ? win : null,
    place: Number.isFinite(Number(src.place)) ? Number(src.place) : null,
    confirmed: src.confirmed !== false && Number.isFinite(win),
    updatedAt: src.updatedAt || null,
  };
}

export function createPopularity(raw) {
  if (raw == null) {
    return { value: null, confirmed: false };
  }
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
  if (raw == null || raw === "") {
    return {
      jockeyId: null,
      name: "",
      winRate: null,
      placeRate: null,
      confirmed: false,
    };
  }
  if (typeof raw === "string") {
    return { jockeyId: null, name: raw, winRate: null, placeRate: null, confirmed: false };
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
  if (raw == null || raw === "") {
    return {
      trainerId: null,
      name: "",
      winRate: null,
      placeRate: null,
      confirmed: false,
    };
  }
  if (typeof raw === "string") {
    return { trainerId: null, name: raw, winRate: null, placeRate: null, confirmed: false };
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

/** Ver8.0 News — メタデータのみ（本文・画像・SNSなし） */
export function createNews(raw = {}) {
  return {
    modelVersion: UNIFIED_VERSION,
    kind: "News",
    newsId: raw.id || raw.newsId || null,
    publishedAt: raw.publishedAt || null,
    title: raw.title || "",
    category: raw.category || "other",
    categoryLabel: raw.categoryLabel || raw.category || "",
    raceNumber: raw.raceNumber != null ? Number(raw.raceNumber) : null,
    venueId: raw.venueId || null,
    horses: Array.isArray(raw.horses) ? raw.horses : [],
    jockeys: Array.isArray(raw.jockeys) ? raw.jockeys : [],
    trainers: Array.isArray(raw.trainers) ? raw.trainers : [],
    source: raw.source || "",
    updatedAt: raw.updatedAt || null,
    updateCount: Number(raw.updateCount) || 1,
    freshnessScore: raw.freshnessScore != null ? Number(raw.freshnessScore) : null,
    importanceScore:
      raw.importanceScore != null ? Number(raw.importanceScore) : null,
    reliabilityScore:
      raw.reliabilityScore != null ? Number(raw.reliabilityScore) : null,
    coverageScore: raw.coverageScore != null ? Number(raw.coverageScore) : null,
    analysisStage: createAnalysisStageRef(raw.analysisStage ?? raw.stage),
    learning: raw.learning ? createLearningDataRef(raw.learning) : null,
    knowledge: raw.knowledge ? createKnowledgeRef(raw.knowledge) : null,
    // 本文は Unified にも載せない
  };
}

/** Ver8.1 Social — 構造化メタデータのみ（投稿本文・画像・動画・コメントなし） */
export function createSocial(raw = {}) {
  return {
    modelVersion: UNIFIED_VERSION,
    kind: "Social",
    available: raw.available !== false,
    itemCount: Number(raw.itemCount) || 0,
    totalPosts: Number(raw.totalPosts) || 0,
    trendChange: raw.trendChange != null ? Number(raw.trendChange) : null,
    scores: raw.scores
      ? {
          trend: Number(raw.scores.trend) || 0,
          attention: Number(raw.scores.attention) || 0,
          momentum: Number(raw.scores.momentum) || 0,
          confidence: Number(raw.scores.confidence) || 0,
        }
      : null,
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    topCategories: Array.isArray(raw.topCategories) ? raw.topCategories : [],
    horses: Array.isArray(raw.horses) ? raw.horses : [],
    importantTopics: Array.isArray(raw.importantTopics)
      ? raw.importantTopics
      : [],
    aiPayload: raw.aiPayload || null,
    validation: raw.validation || null,
    syncState: raw.syncState || "idle",
    updatedAt: raw.updatedAt || null,
    providerId: raw.providerId || null,
    mode: raw.mode || null,
    bodiesStored: false,
    analysisStage: createAnalysisStageRef(raw.analysisStage ?? raw.stage),
    learning: raw.learning ? createLearningDataRef(raw.learning) : null,
    knowledge: raw.knowledge ? createKnowledgeRef(raw.knowledge) : null,
  };
}

/** Ver8.2 Evidence */
export function createEvidence(raw = {}) {
  return {
    modelVersion: UNIFIED_VERSION,
    kind: "Evidence",
    evidenceId: raw.id || raw.evidenceId || null,
    source: raw.source || "",
    sourceLabel: raw.sourceLabel || raw.source || "",
    claimType: raw.claimType || "",
    claim: raw.claim || "",
    subject: raw.subject || null,
    value: raw.value ?? null,
    polarity: raw.polarity || "neutral",
    horseNames: Array.isArray(raw.horseNames) ? raw.horseNames : [],
    updatedAt: raw.updatedAt || null,
    scores: raw.scores
      ? {
          confidence: Number(raw.scores.confidence) || 0,
          freshness: Number(raw.scores.freshness) || 0,
          reliability: Number(raw.scores.reliability) || 0,
          coverage: Number(raw.scores.coverage) || 0,
          importance: Number(raw.scores.importance) || 0,
        }
      : null,
    available: raw.available !== false,
    role: raw.role || null,
    meta: raw.meta || {},
  };
}

/** Ver8.2 Conflict */
export function createConflict(raw = {}) {
  return {
    modelVersion: UNIFIED_VERSION,
    kind: "Conflict",
    conflictId: raw.id || raw.conflictId || null,
    claimType: raw.claimType || "",
    subject: raw.subject || null,
    members: Array.isArray(raw.members) ? raw.members : [],
    adoptedId: raw.adoptedId || null,
    excludedIds: Array.isArray(raw.excludedIds) ? raw.excludedIds : [],
    reason: raw.reason || "",
    severity: raw.severity || "low",
  };
}

/** Ver8.2 Consensus */
export function createConsensus(raw = {}) {
  return {
    modelVersion: UNIFIED_VERSION,
    kind: "Consensus",
    consensusScore:
      raw.consensusScore != null ? Number(raw.consensusScore) : null,
    agreementScore:
      raw.agreementScore != null ? Number(raw.agreementScore) : null,
    conflictScore:
      raw.conflictScore != null ? Number(raw.conflictScore) : null,
    finalConfidence:
      raw.finalConfidence != null ? Number(raw.finalConfidence) : null,
    adoptedCount: Number(raw.adoptedCount) || 0,
    excludedCount: Number(raw.excludedCount) || 0,
    evidenceCount: Number(raw.evidenceCount) || 0,
    conflictCount: Number(raw.conflictCount) || 0,
  };
}

/** Ver8.2 Reasoning */
export function createReasoning(raw = {}) {
  return {
    modelVersion: UNIFIED_VERSION,
    kind: "Reasoning",
    agreed: Array.isArray(raw.agreed) ? raw.agreed : [],
    conflicted: Array.isArray(raw.conflicted) ? raw.conflicted : [],
    adopted: Array.isArray(raw.adopted) ? raw.adopted : [],
    excluded: Array.isArray(raw.excluded) ? raw.excluded : [],
    conflictReasons: Array.isArray(raw.conflictReasons)
      ? raw.conflictReasons
      : [],
    narrative: raw.narrative || "",
    judgment: raw.judgment || null,
  };
}

/** Ver8.2 Discussion — Evidence比較・合意形成の統合結果 */
export function createDiscussion(raw = {}) {
  return {
    modelVersion: UNIFIED_VERSION,
    kind: "Discussion",
    available: raw.available !== false,
    status: raw.status || "idle",
    evidence: Array.isArray(raw.evidence)
      ? raw.evidence.map((e) =>
          e?.kind === "Evidence" ? e : createEvidence(e)
        )
      : [],
    conflicts: Array.isArray(raw.conflicts)
      ? raw.conflicts.map((c) =>
          c?.kind === "Conflict" ? c : createConflict(c)
        )
      : [],
    consensus: raw.consensus
      ? raw.consensus.kind === "Consensus"
        ? raw.consensus
        : createConsensus(raw.consensus)
      : createConsensus({}),
    reasoning: raw.reasoning
      ? raw.reasoning.kind === "Reasoning"
        ? raw.reasoning
        : createReasoning(raw.reasoning)
      : createReasoning({}),
    aiPayload: raw.aiPayload || null,
    validation: raw.validation || null,
    updatedAt: raw.updatedAt || null,
    version: raw.version || null,
    analysisStage: createAnalysisStageRef(raw.analysisStage ?? raw.stage),
    learning: raw.learning ? createLearningDataRef(raw.learning) : null,
    knowledge: raw.knowledge ? createKnowledgeRef(raw.knowledge) : null,
  };
}

/** Ver8.3 Contribution */
export function createContribution(raw = {}) {
  return {
    modelVersion: UNIFIED_VERSION,
    kind: "Contribution",
    factor: raw.factor || "",
    label: raw.label || raw.factor || "",
    percent: Number(raw.percent) || 0,
    weightRaw: raw.weightRaw != null ? Number(raw.weightRaw) : null,
  };
}

/** Ver8.3 Reason（説明文単位） */
export function createReason(raw = {}) {
  return {
    modelVersion: UNIFIED_VERSION,
    kind: "Reason",
    type: raw.type || "overall",
    text: raw.text || "",
    evidenceId: raw.evidenceId || null,
    horseNames: Array.isArray(raw.horseNames) ? raw.horseNames : [],
    polarity: raw.polarity || null,
  };
}

/** Ver8.3 Confidence 説明 */
export function createConfidence(raw = {}) {
  return {
    modelVersion: UNIFIED_VERSION,
    kind: "Confidence",
    finalConfidence:
      raw.finalConfidence != null ? Number(raw.finalConfidence) : null,
    consensusScore:
      raw.consensusScore != null ? Number(raw.consensusScore) : null,
    agreementScore:
      raw.agreementScore != null ? Number(raw.agreementScore) : null,
    conflictScore:
      raw.conflictScore != null ? Number(raw.conflictScore) : null,
    stage: raw.stage != null ? Number(raw.stage) : null,
    summary: raw.summary || "",
    details: Array.isArray(raw.details) ? raw.details : [],
  };
}

/** Ver8.3 Prediction Diff */
export function createPredictionDiff(raw = {}) {
  return {
    modelVersion: UNIFIED_VERSION,
    kind: "PredictionDiff",
    available: raw.available === true,
    previousAt: raw.previousAt || null,
    rankChanges: Array.isArray(raw.rankChanges) ? raw.rankChanges : [],
    confidenceDelta:
      raw.confidenceDelta != null ? Number(raw.confidenceDelta) : null,
    confidenceFrom:
      raw.confidenceFrom != null ? Number(raw.confidenceFrom) : null,
    confidenceTo: raw.confidenceTo != null ? Number(raw.confidenceTo) : null,
    newEvidence: Array.isArray(raw.newEvidence) ? raw.newEvidence : [],
    removedEvidence: Array.isArray(raw.removedEvidence)
      ? raw.removedEvidence
      : [],
    highlights: Array.isArray(raw.highlights) ? raw.highlights : [],
    stageFrom: raw.stageFrom != null ? Number(raw.stageFrom) : null,
    stageTo: raw.stageTo != null ? Number(raw.stageTo) : null,
  };
}

/** Ver8.3 Explain — 予想根拠の説明パッケージ */
export function createExplain(raw = {}) {
  return {
    modelVersion: UNIFIED_VERSION,
    kind: "Explain",
    available: raw.available !== false,
    status: raw.status || "idle",
    overallReason: raw.overallReason || "",
    contributions: Array.isArray(raw.contributions)
      ? raw.contributions.map((c) =>
          c?.kind === "Contribution" ? c : createContribution(c)
        )
      : [],
    reasons: Array.isArray(raw.reasons)
      ? raw.reasons.map((r) => (r?.kind === "Reason" ? r : createReason(r)))
      : [],
    evidence: Array.isArray(raw.evidence)
      ? raw.evidence.map((e) =>
          e?.kind === "Evidence" ? e : createEvidence(e)
        )
      : [],
    confidence: raw.confidence
      ? raw.confidence.kind === "Confidence"
        ? raw.confidence
        : createConfidence(raw.confidence)
      : createConfidence({}),
    diff: raw.diff
      ? raw.diff.kind === "PredictionDiff"
        ? raw.diff
        : createPredictionDiff(raw.diff)
      : createPredictionDiff({ available: false }),
    aiPayload: raw.aiPayload || null,
    validation: raw.validation || null,
    stage: raw.stage != null ? Number(raw.stage) : null,
    updatedAt: raw.updatedAt || null,
    version: raw.version || null,
    analysisStage: createAnalysisStageRef(raw.analysisStage ?? raw.stage),
    learning: raw.learning ? createLearningDataRef(raw.learning) : null,
    knowledge: raw.knowledge ? createKnowledgeRef(raw.knowledge) : null,
  };
}

/** Ver8.4 Knowledge Node */
export function createKnowledgeNode(raw = {}) {
  return {
    modelVersion: UNIFIED_VERSION,
    kind: "KnowledgeNode",
    nodeId: raw.id || raw.nodeId || null,
    type: raw.type || "",
    key: raw.key || "",
    label: raw.label || "",
    props: raw.props || {},
    scores: raw.scores
      ? {
          importance: Number(raw.scores.importance) || 0,
          reliability: Number(raw.scores.reliability) || 0,
          freshness: Number(raw.scores.freshness) || 0,
          connectivity: Number(raw.scores.connectivity) || 0,
          knowledgeScore: Number(raw.scores.knowledgeScore) || 0,
        }
      : null,
    updatedAt: raw.updatedAt || null,
  };
}

/** Ver8.4 Knowledge Edge */
export function createKnowledgeEdge(raw = {}) {
  return {
    modelVersion: UNIFIED_VERSION,
    kind: "KnowledgeEdge",
    edgeId: raw.id || raw.edgeId || null,
    type: raw.type || "",
    fromId: raw.fromId || null,
    toId: raw.toId || null,
    weight: Number(raw.weight) || 1,
    props: raw.props || {},
    updatedAt: raw.updatedAt || null,
  };
}

/** Ver8.4 Knowledge Graph — AI推論基盤 */
export function createKnowledgeGraph(raw = {}) {
  return {
    modelVersion: UNIFIED_VERSION,
    kind: "KnowledgeGraph",
    available: raw.available !== false,
    version: raw.version || null,
    nodeCount: Number(raw.nodeCount) || 0,
    edgeCount: Number(raw.edgeCount) || 0,
    knowledgeScore:
      raw.knowledgeScore != null ? Number(raw.knowledgeScore) : null,
    nodes: Array.isArray(raw.nodes)
      ? raw.nodes.map((n) =>
          n?.kind === "KnowledgeNode" ? n : createKnowledgeNode(n)
        )
      : [],
    edges: Array.isArray(raw.edges)
      ? raw.edges.map((e) =>
          e?.kind === "KnowledgeEdge" ? e : createKnowledgeEdge(e)
        )
      : [],
    validation: raw.validation || null,
    syncState: raw.syncState || null,
    indexerState: raw.indexerState || null,
    queryState: raw.queryState || null,
    updatedAt: raw.updatedAt || null,
    analysisStage: createAnalysisStageRef(raw.analysisStage ?? raw.stage),
    learning: raw.learning ? createLearningDataRef(raw.learning) : null,
    knowledge: raw.knowledge ? createKnowledgeRef(raw.knowledge) : null,
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
    raw.odds != null && typeof raw.odds === "object"
      ? raw.odds
      : { win: raw.odds, popularity: raw.popularity }
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
    affiliation: raw.affiliation || "",
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
    entryStatus: raw.entryStatus || null,
    entryStatusLabel: raw.entryStatusLabel || null,
    careerRecord: raw.careerRecord || null,
    distanceRecord: raw.distanceRecord || null,
    courseRecord: raw.courseRecord || null,
    trackRecord: raw.trackRecord || null,
    stakesRecord: raw.stakesRecord || null,
    earnings: raw.earnings != null ? Number(raw.earnings) : null,
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

/** Ver7.6 / Ver10.1 HorseEntry — Stage に応じて枠・騎手・斤量を確定反映 */
export function createHorseEntry(raw = {}) {
  const frameConfirmed = Boolean(raw.frameConfirmed);
  const jockeyConfirmed = Boolean(raw.jockeyConfirmed);
  const weightConfirmed = Boolean(raw.weightConfirmed);
  const numberConfirmed = Boolean(raw.numberConfirmed);

  const horse = createHorse({
    ...raw,
    frame: frameConfirmed ? raw.frame ?? raw._rawFrame : null,
    jockey: jockeyConfirmed ? raw.jockey ?? raw._rawJockey : null,
    weight: weightConfirmed ? raw.weight ?? raw._rawWeight : null,
    odds: null,
    popularity: null,
  });
  const entryStatus = raw.entryStatus || "registered";
  return {
    modelVersion: UNIFIED_VERSION,
    kind: "HorseEntry",
    ...horse,
    entryStatus,
    entryStatusLabel: raw.entryStatusLabel || entryStatus || "",
    affiliation: raw.affiliation || horse.affiliation || "",
    careerRecord: raw.careerRecord || "",
    recentForm: raw.recentForm || raw.last3 || [],
    distanceRecord: raw.distanceRecord || "",
    courseRecord: raw.courseRecord || "",
    trackRecord: raw.trackRecord || "",
    stakesRecord: raw.stakesRecord || "",
    earnings: raw.earnings != null ? Number(raw.earnings) : null,
    jockeyId: raw.jockeyId || raw._rawJockeyId || null,
    trainerId: raw.trainerId || null,
    carriedWeight: raw.carriedWeight ?? raw._rawCarriedWeight ?? null,
    analysisStage: createAnalysisStageRef(raw.analysisStage ?? raw.stage),
    learning: raw.learning ? createLearningDataRef(raw.learning) : null,
    knowledge: raw.knowledge ? createKnowledgeRef(raw.knowledge) : null,
    frameConfirmed,
    numberConfirmed,
    jockeyConfirmed,
    weightConfirmed,
    oddsConfirmed: false,
    _rawFrame: raw._rawFrame ?? raw.frame,
    _rawJockey: raw._rawJockey ?? (typeof raw.jockey === "object" ? raw.jockey?.name : raw.jockey),
    _rawJockeyId: raw._rawJockeyId ?? raw.jockeyId,
    _rawWeight: raw._rawWeight ?? raw.weight,
    _rawCarriedWeight: raw._rawCarriedWeight ?? raw.carriedWeight,
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
    weather: typeof raw.weather === "object" && raw.weather?.weather
      ? raw.weather.weather
      : raw.weather || "",
    weatherModel: raw.weatherModel
      ? createWeather(raw.weatherModel)
      : typeof raw.weather === "object" && raw.weather
        ? createWeather(raw.weather)
        : null,
    trackModel: raw.trackModel
      ? createTrack(raw.trackModel)
      : raw.trackCondition
        ? createTrack({
            trackCondition: raw.trackCondition,
            surface: raw.surface || raw.track,
            surfaceState: raw.surfaceState,
            turfCondition: raw.turfCondition,
            dirtCondition: raw.dirtCondition,
            moisture: raw.moisture,
            moistureAvailable: raw.moistureAvailable,
            trackScore: raw.trackScore,
            surfaceScore: raw.surfaceScore,
            updatedAt: raw.weatherUpdatedAt || raw.updatedAt,
            source: raw.source,
          })
        : null,
    trackCondition: raw.trackCondition || "",
    temperature: raw.temperature ?? null,
    humidity: raw.humidity ?? null,
    windSpeed: raw.windSpeed ?? null,
    windDirection: raw.windDirection || "",
    precipitation: raw.precipitation ?? null,
    weatherScore: raw.weatherScore ?? null,
    trackScore: raw.trackScore ?? null,
    surfaceScore: raw.surfaceScore ?? null,
    startTime: raw.startTime || raw.time || "",
    courseDirection: raw.courseDirection || "",
    courseLoop: raw.courseLoop || raw.course || "",
    fieldSize: Number(raw.fieldSize) || horseModels.length,
    pacePrediction: raw.pacePrediction || "",
    grade: raw.grade || "",
    raceClass: raw.raceClass || raw.class || "",
    ageCondition: raw.ageCondition || raw.age || "",
    prize: Number(raw.prize ?? raw.prizeMoney) || 0,
    horses: horseModels,
    analysisStage: createAnalysisStageRef(raw.analysisStage ?? raw.stage),
    learning: raw.learning ? createLearningDataRef(raw.learning) : null,
    knowledge: raw.knowledge ? createKnowledgeRef(raw.knowledge) : null,
    review: raw.review ? createReviewRef(raw.review) : null,
    news: Array.isArray(raw.news) ? raw.news.map((n) => createNews(n)) : [],
    social: raw.social
      ? createSocial(raw.social)
      : createSocial({ available: false }),
    discussion: raw.discussion
      ? createDiscussion(raw.discussion)
      : createDiscussion({ available: false }),
    explain: raw.explain
      ? createExplain(raw.explain)
      : createExplain({ available: false }),
    knowledgeGraph: raw.knowledgeGraph
      ? createKnowledgeGraph(raw.knowledgeGraph)
      : createKnowledgeGraph({ available: false }),
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
