/* ========================================
   PAPAPA IQ KEIBA - Data Normalizer
   Ver5.2 Real Intelligence Connect
   ======================================== */

import {
  createAnalysis,
  createComment,
  createHistory,
  createHorse,
  createNews,
  createOdds,
  createRace,
  createSentiment,
  createTrack,
  createTrend,
  createWeather,
} from "./models.js";

export function normalizeProviderItems(providerId, items = [], kind = "auto") {
  const list = Array.isArray(items) ? items : [];
  const out = emptyBucket();

  for (const item of list) {
    const type = kind === "auto" ? guessType(item) : kind;
    const withSource = { ...item, source: item.source || providerId };

    switch (type) {
      case "horse":
        out.horses.push(createHorse(withSource));
        break;
      case "race":
        out.races.push(createRace(withSource));
        out.tracks.push(
          createTrack({
            venue: withSource.venue,
            venueLabel: withSource.venueLabel,
            surface: withSource.track,
            condition: withSource.condition,
            source: withSource.source,
          })
        );
        if (withSource.weather) {
          out.weathers.push(
            createWeather({
              weather: withSource.weather,
              source: withSource.source,
            })
          );
        }
        break;
      case "odds":
        out.odds.push(createOdds(withSource));
        break;
      case "history":
        out.histories.push(createHistory(withSource));
        break;
      case "track":
        out.tracks.push(createTrack(withSource));
        break;
      case "weather":
        out.weathers.push(createWeather(withSource));
        break;
      case "news":
        out.news.push(createNews(withSource));
        break;
      case "comment":
        out.comments.push(createComment(withSource));
        break;
      case "trend":
        out.trends.push(createTrend(withSource));
        break;
      case "sentiment":
        out.sentiments.push(createSentiment(withSource));
        break;
      case "analysis":
        out.analyses.push(createAnalysis(withSource));
        break;
      default:
        break;
    }
  }

  return out;
}

export function mergeNormalized(parts = []) {
  const merged = emptyBucket();
  for (const part of parts) {
    if (!part) continue;
    for (const key of Object.keys(merged)) {
      if (Array.isArray(part[key])) merged[key].push(...part[key]);
    }
  }
  return merged;
}

function emptyBucket() {
  return {
    horses: [],
    races: [],
    odds: [],
    histories: [],
    tracks: [],
    weathers: [],
    news: [],
    comments: [],
    trends: [],
    sentiments: [],
    analyses: [],
  };
}

function guessType(item) {
  if (!item || typeof item !== "object") return "unknown";
  if (item.type) return String(item.type).toLowerCase();
  if (item.polarity != null) return "sentiment";
  if (item.keyword != null && item.volume != null) return "trend";
  if (item.title && (item.body || item.url)) return "news";
  if (item.finish != null || item.last3f != null) return "history";
  if (item.win != null || item.place != null) return "odds";
  if (item.surface != null && item.venue != null && !item.number) return "track";
  if (item.weather != null && !item.number) return "weather";
  if (item.jockey != null || item.trainer != null) return "horse";
  if (item.venue != null || item.distance != null) return "race";
  if (item.text && item.author) return "comment";
  if (item.scores || item.signals) return "analysis";
  return "unknown";
}
