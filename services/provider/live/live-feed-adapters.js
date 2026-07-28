/* ========================================
   RSS / Open-Meteo / Social public adapters
   ======================================== */

import {
  VENUE_COORDINATES,
  wmoToWeatherLabel,
  precipToTrackCondition,
  toJstDate,
} from "./netkeiba-utils.js";

export const LIVE_FEED_ADAPTER_VERSION = "10.9.0";

/** Open-Meteo ベース（JMA 高解像度を優先、失敗時 forecast） */
export const OPEN_METEO_JMA_BASE = "https://api.open-meteo.com/v1/jma";
export const OPEN_METEO_FORECAST_BASE = "https://api.open-meteo.com/v1/forecast";

/**
 * Google News RSS XML → news raw items（メタデータのみ）
 */
export function parseGoogleNewsRss(xml = "", options = {}) {
  const items = [];
  const blocks = String(xml || "").match(/<item[\s\S]*?<\/item>/gi) || [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const title = decodeXml(extractTag(block, "title"));
    const pubDate = extractTag(block, "pubDate");
    const link = extractTag(block, "link");
    const source = decodeXml(extractTag(block, "source")) || "google-news";
    if (!title) continue;
    const publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
    items.push({
      id: `gn_${i + 1}_${hashShort(title)}`,
      title: title.replace(/ - .*$/, "").trim() || title,
      publishedAt,
      updatedAt: publishedAt,
      category: classifyNewsTitle(title),
      raceNumber: options.raceNumber != null ? Number(options.raceNumber) : null,
      venueId: options.venueId || null,
      horses: [],
      jockeys: [],
      trainers: [],
      source: source || "google-news",
      updateCount: 1,
      importanceHint: importanceFromTitle(title),
      providerName: "Real News (Google News RSS)",
      link: link || null,
    });
  }

  return {
    version: LIVE_FEED_ADAPTER_VERSION,
    source: "real-live",
    providerId: "real-news",
    providerName: "Real News",
    updatedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    raceDate: options.raceDate || options.date || null,
    venueId: options.venueId || null,
    raceNumber: options.raceNumber != null ? Number(options.raceNumber) : null,
    note: "Metadata only. No article body or images.",
    items,
  };
}

/**
 * Open-Meteo JSON → weather raw
 */
export function adaptOpenMeteoWeather(apiJson = {}, options = {}) {
  const venueId = String(options.venueId || options.venue || "tokyo").toLowerCase();
  const coords = VENUE_COORDINATES[venueId] || VENUE_COORDINATES.tokyo;
  const current = apiJson.current || {};
  const hourly = apiJson.hourly || {};
  const weatherCode = current.weather_code;
  const weather = wmoToWeatherLabel(weatherCode);
  const precip =
    current.precipitation != null
      ? Number(current.precipitation)
      : current.rain != null
        ? Number(current.rain)
        : 0;
  const recentPrecip = sumRecentPrecip(hourly);
  const trackCondition =
    options.trackCondition ||
    precipToTrackCondition(precip, recentPrecip);
  // 公開APIに含水率は無い → 直近降水から推定（低リスク補助）
  const moisture = Math.max(
    0,
    Math.min(100, Math.round(recentPrecip * 18 + precip * 25))
  );

  const history = buildHourlyHistory(hourly, 6);

  return {
    version: LIVE_FEED_ADAPTER_VERSION,
    source: "real-live",
    providerId: "real-weather",
    providerName: options.providerName || "Real Weather (Open-Meteo JMA)",
    updatedAt: current.time
      ? new Date(current.time).toISOString()
      : new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    raceDate: options.raceDate || options.date || null,
    venueId,
    raceNumber: options.raceNumber != null ? Number(options.raceNumber) : null,
    phase: options.phase || "final",
    weather: {
      weather,
      temperature:
        current.temperature_2m != null ? Number(current.temperature_2m) : null,
      humidity:
        current.relative_humidity_2m != null
          ? Number(current.relative_humidity_2m)
          : null,
      windSpeed:
        current.wind_speed_10m != null ? Number(current.wind_speed_10m) : null,
      windDirection: degreesToDirection(current.wind_direction_10m),
      trackCondition,
      surface: options.surface || "芝",
      surfaceState: moisture >= 55 ? "重め" : moisture >= 30 ? "稍重寄り" : "標準",
      turfCondition: trackCondition,
      dirtCondition: trackCondition,
      moisture,
      moistureAvailable: true,
      moistureSource: "precip-estimate",
      precipitation: precip,
      precipitationAvailable: true,
      recentPrecipitation: recentPrecip,
      updatedAt: current.time
        ? new Date(current.time).toISOString()
        : new Date().toISOString(),
      providerName: options.providerName || "Real Weather (Open-Meteo JMA)",
      history,
      latitude: coords.lat,
      longitude: coords.lon,
      weatherCode,
      model: options.model || "jma",
    },
  };
}

export function buildOpenMeteoUrl(venueId = "tokyo", options = {}) {
  const id = String(venueId || "tokyo").toLowerCase();
  const coords = VENUE_COORDINATES[id] || VENUE_COORDINATES.tokyo;
  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "precipitation",
      "rain",
    ].join(","),
    hourly: [
      "temperature_2m",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "relative_humidity_2m",
    ].join(","),
    timezone: "Asia/Tokyo",
    forecast_days: "2",
  });
  const base =
    options.useForecast === true
      ? OPEN_METEO_FORECAST_BASE
      : OPEN_METEO_JMA_BASE;
  return `${base}?${params.toString()}`;
}

/**
 * Wikipedia OpenSearch（CORS・origin=*）
 */
export function buildWikipediaOpenSearchUrl(query = "") {
  const q = encodeURIComponent(String(query || "").trim());
  return `https://ja.wikipedia.org/w/api.php?action=opensearch&search=${q}&limit=1&namespace=0&format=json&origin=*`;
}

/**
 * Wikipedia pageviews + HN → social metadata items
 */
export function adaptSocialPublicFeeds({
  pageviews = [],
  hnHits = [],
  newsItems = [],
  options = {},
} = {}) {
  const items = [];
  let idx = 0;

  for (const pv of pageviews) {
    idx += 1;
    const views = Number(pv.views) || 0;
    const prev = Number(pv.prevViews) || Math.max(0, Math.floor(views * 0.7));
    const horseNames = Array.isArray(pv.horses)
      ? pv.horses
      : pv.horse
        ? [pv.horse]
        : [];
    items.push({
      id: `wp_${idx}_${hashShort(pv.title || "")}`,
      publishedAt: pv.timestamp || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      topicKey: slugify(pv.title || `wiki_${idx}`),
      category: horseNames.length ? "other" : "other",
      raceNumber: options.raceNumber != null ? Number(options.raceNumber) : null,
      venueId: options.venueId || null,
      horses: horseNames,
      jockeys: [],
      trainers: [],
      postType: horseNames.length ? "horse" : "topic",
      source: pv.source || "wikipedia-pageviews",
      postCount: views,
      prevPostCount: prev,
      importanceHint: views > 5000 ? "high" : views > 1000 ? "medium" : "low",
      providerName: "Real Social",
      title: pv.title || null,
    });
  }

  for (const hit of hnHits) {
    idx += 1;
    const points = Number(hit.points) || 0;
    const comments = Number(hit.num_comments) || 0;
    items.push({
      id: `hn_${hit.objectID || idx}`,
      publishedAt: hit.created_at
        ? new Date(hit.created_at).toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      topicKey: slugify(hit.title || `hn_${idx}`),
      category: "other",
      raceNumber: options.raceNumber != null ? Number(options.raceNumber) : null,
      venueId: options.venueId || null,
      horses: [],
      jockeys: [],
      trainers: [],
      postType: "topic",
      source: "hackernews",
      postCount: points + comments,
      prevPostCount: Math.max(0, points),
      importanceHint: points >= 50 ? "high" : points >= 10 ? "medium" : "low",
      providerName: "Real Social",
      title: hit.title || null,
    });
  }

  // News titles as social topics with updateCount as weak engagement signal
  for (const n of newsItems.slice(0, 8)) {
    idx += 1;
    items.push({
      id: `ns_${n.id || idx}`,
      publishedAt: n.publishedAt || new Date().toISOString(),
      updatedAt: n.updatedAt || n.publishedAt || new Date().toISOString(),
      topicKey: slugify(n.title || `news_${idx}`),
      category: n.category || "other",
      raceNumber: options.raceNumber != null ? Number(options.raceNumber) : null,
      venueId: options.venueId || null,
      horses: [],
      jockeys: [],
      trainers: [],
      postType: "topic",
      source: "news-topic",
      postCount: Number(n.updateCount) || 1,
      prevPostCount: 1,
      importanceHint: n.importanceHint || "medium",
      providerName: "Real Social",
      title: n.title || null,
    });
  }

  return {
    version: LIVE_FEED_ADAPTER_VERSION,
    source: "real-live",
    providerId: "real-social",
    providerName: "Real Social",
    updatedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    raceDate: options.raceDate || options.date || null,
    venueId: options.venueId || null,
    raceNumber: options.raceNumber != null ? Number(options.raceNumber) : null,
    note: "Metadata only. No SNS post body, images, or videos.",
    items,
  };
}

export function buildGoogleNewsRssUrl(query = "競馬") {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=ja&gl=JP&ceid=JP:ja`;
}

export function buildWikipediaPageviewsUrl(title, startYmd, endYmd) {
  const article = encodeURIComponent(title.replace(/ /g, "_"));
  return `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/ja.wikipedia/all-access/all-agents/${article}/daily/${startYmd}/${endYmd}`;
}

export function buildHnSearchUrl(query = "horse racing OR keiba") {
  const q = encodeURIComponent(query);
  return `https://hn.algolia.com/api/v1/search?query=${q}&tags=story&hitsPerPage=10`;
}

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = String(xml).match(re);
  if (!m) return "";
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function decodeXml(s = "") {
  return String(s)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function classifyNewsTitle(title = "") {
  const t = String(title);
  if (/取消|除外|回避/.test(t)) return "scratch";
  if (/騎手|乗り替/.test(t)) return "jockey";
  if (/調教|追い切り/.test(t)) return "training";
  if (/馬場|芝|ダート|含水/.test(t)) return "track";
  if (/オッズ|人気/.test(t)) return "odds";
  return "other";
}

function importanceFromTitle(title = "") {
  const t = String(title);
  if (/取消|除外|G1|GI|重賞/.test(t)) return "high";
  if (/追い切り|騎手|馬場/.test(t)) return "medium";
  return "low";
}

function degreesToDirection(deg) {
  if (deg == null || !Number.isFinite(Number(deg))) return null;
  const d = ((Number(deg) % 360) + 360) % 360;
  const dirs = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"];
  return dirs[Math.round(d / 45) % 8];
}

function sumRecentPrecip(hourly = {}) {
  const precip = hourly.precipitation || [];
  return precip.slice(-6).reduce((a, b) => a + (Number(b) || 0), 0);
}

function buildHourlyHistory(hourly = {}, limit = 6) {
  const times = hourly.time || [];
  const temps = hourly.temperature_2m || [];
  const precip = hourly.precipitation || [];
  const codes = hourly.weather_code || [];
  const winds = hourly.wind_speed_10m || [];
  const out = [];
  const start = Math.max(0, times.length - limit);
  for (let i = start; i < times.length; i++) {
    out.push({
      at: times[i] ? new Date(times[i]).toISOString() : null,
      weather: wmoToWeatherLabel(codes[i]),
      trackCondition: precipToTrackCondition(precip[i]),
      windSpeed: winds[i] != null ? Number(winds[i]) : null,
      temperature: temps[i] != null ? Number(temps[i]) : null,
      precipitation: precip[i] != null ? Number(precip[i]) : null,
    });
  }
  return out;
}

function hashShort(s = "") {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(16).slice(0, 8);
}

function slugify(s = "") {
  return String(s)
    .toLowerCase()
    .replace(/[^\w\u3040-\u30ff\u4e00-\u9faf]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "topic";
}

export function ymdJst(offsetDays = 0) {
  const d = toJstDate(new Date());
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export const LiveFeedAdapters = {
  parseGoogleNewsRss,
  adaptOpenMeteoWeather,
  adaptSocialPublicFeeds,
  buildOpenMeteoUrl,
  buildGoogleNewsRssUrl,
  buildWikipediaPageviewsUrl,
  buildWikipediaOpenSearchUrl,
  buildHnSearchUrl,
  version: LIVE_FEED_ADAPTER_VERSION,
};
