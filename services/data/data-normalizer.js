/* ========================================
   DataNormalizer — Ver7.0
   Provider固有形式 → Unified Model
   ======================================== */

import {
  createRaceModel,
  createHorseModel,
  createMarketModel,
  normalizeSurfaceDistance,
  normalizeSurface,
  normalizeDistance,
  toLegacyHorses,
  toLegacyRace,
} from "./unified-models.js";
import { toStr } from "./utils.js";

/**
 * Provider raw bundle → 正規化済み Unified + legacy
 */
export function normalizeBundle(rawBundle = {}) {
  const raw = rawBundle.raw || rawBundle;
  const raceRaw = normalizeRaceFields(raw.race || {});
  const horsesRaw = (raw.horses || []).map(normalizeHorseFields);
  const race = createRaceModel(raceRaw, horsesRaw);
  const horses = race.horses;
  const market = raw.market
    ? createMarketModel(raw.market)
    : race.market;

  return {
    unified: {
      race,
      horses,
      market,
      settings: raw.settings || {},
      venues: raw.venues || [],
      races: (raw.races || []).map((r) =>
        createRaceModel(normalizeRaceFields(r), [])
      ),
    },
    legacy: {
      race: toLegacyRace(race),
      horses: toLegacyHorses(horses),
      settings: raw.settings || {},
    },
    meta: {
      providerId: rawBundle.providerId || null,
      sourceLabel: rawBundle.sourceLabel || null,
      surfaceDistance: race.surfaceDistance,
      normalizedAt: new Date().toISOString(),
    },
  };
}

export function normalizeRaceFields(raw = {}) {
  // 「芝1600」「芝1600m」「1600芝」などを分解
  const parsed = parseSurfaceDistanceBlob(
    raw.surfaceDistance || raw.courseLabel || raw.distanceLabel || ""
  );
  let surface = raw.surface || raw.track || parsed.surface;
  let distance = raw.distance || parsed.distance;

  // distance に「芝1600」が入っているケース
  if (typeof distance === "string" && /[芝ダ]/.test(distance)) {
    const p = parseSurfaceDistanceBlob(distance);
    surface = surface || p.surface;
    distance = p.distance;
  }

  return {
    ...raw,
    surface: normalizeSurface(surface),
    track: normalizeSurface(surface),
    distance: normalizeDistance(distance),
    surfaceDistance: normalizeSurfaceDistance(surface, distance),
    venueLabel: toStr(raw.venueLabel || raw.course || raw.venue),
    trackCondition: toStr(raw.trackCondition || raw.condition, "良"),
    weather: toStr(raw.weather),
  };
}

export function normalizeHorseFields(raw = {}) {
  return {
    ...raw,
    horseName: toStr(raw.horseName || raw.horse || raw.name),
    jockey: toStr(typeof raw.jockey === "object" ? raw.jockey?.name : raw.jockey),
    trainer: toStr(
      typeof raw.trainer === "object" ? raw.trainer?.name : raw.trainer
    ),
    weight: raw.weight,
    odds: typeof raw.odds === "object" ? raw.odds.win : raw.odds,
    popularity: raw.popularity,
  };
}

function parseSurfaceDistanceBlob(text) {
  const s = toStr(text);
  if (!s) return { surface: "", distance: 0 };
  const surfMatch = s.match(/(芝|ダート|ダ|障害)/);
  const distMatch = s.match(/(\d{3,4})/);
  return {
    surface: surfMatch ? surfMatch[1] : "",
    distance: distMatch ? Number(distMatch[1]) : 0,
  };
}

export const DataNormalizer = {
  normalizeBundle,
  normalizeRaceFields,
  normalizeHorseFields,
};
