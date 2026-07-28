/* ========================================
   netkeiba Race List / Shutuba / Odds Markdown Parser
  （r.jina.ai 経由の公開ページ本文）
   ======================================== */

import {
  parseNetkeibaRaceId,
  kaisaiToIso,
  mapSurface,
  inferGrade,
  NETKEIBA_VENUE_BY_CODE,
} from "./netkeiba-utils.js";

export const NETKEIBA_LIVE_PARSER_VERSION = "10.7.0";

/**
 * race_list_sub markdown → calendar raw JSON
 */
export function parseRaceListMarkdown(text = "", kaisaiDate = "") {
  const date = kaisaiToIso(kaisaiDate) || "";
  const races = [];
  const venueMeta = new Map();

  let turfCondition = "";
  let dirtCondition = "";
  let weatherHint = "";

  const lines = String(text || "").split(/\r?\n/);

  for (const line of lines) {
    const weatherMatch = line.match(
      /天気[：:]\s*(?:芝[^：:]*[：:]([^ダ\s]+))?\s*(?:ダ[：:]([^\s]+))?/
    );
    if (weatherMatch) {
      turfCondition = (weatherMatch[1] || "").trim() || turfCondition;
      dirtCondition = (weatherMatch[2] || "").trim() || dirtCondition;
      weatherHint = turfCondition || dirtCondition || weatherHint;
      continue;
    }

    if (!/race_id=\d{12}/.test(line) || !/\d+R\s+/.test(line)) continue;

    const raceId = (line.match(/race_id=(\d{12})/) || [])[1];
    const head = line.match(
      /(\d+)R\s+(.+?)\s+(\d{1,2}:\d{2})\s+([^\d\s\/]+)(\d+)m\s+(\d+)頭/
    );
    if (!raceId || !head) continue;

    const number = Number(head[1]) || 0;
    const raceName = String(head[2] || "").trim();
    const startTime = String(head[3] || "").trim();
    const surface = mapSurface(head[4]);
    const distance = Number(head[5]) || 0;
    const fieldSize = Number(head[6]) || 0;
    const meta = parseNetkeibaRaceId(raceId);
    if (!meta || !number) continue;

    const trackCondition =
      surface === "ダート" ? dirtCondition || turfCondition : turfCondition || dirtCondition;

    const race = {
      date: date || null,
      venueId: meta.venueId,
      venueLabel: meta.venueLabel,
      kai: meta.kai,
      day: meta.day,
      number,
      raceName,
      startTime,
      surface,
      distance,
      courseDirection: "",
      raceClass: raceName,
      grade: inferGrade(raceName),
      ageCondition: "",
      fieldSize,
      defaultStage: 5,
      weather: weatherHint || "",
      trackCondition: trackCondition || "",
      turfCondition: turfCondition || "",
      dirtCondition: dirtCondition || "",
      raceId,
      sourceUrl: `https://race.netkeiba.com/race/shutuba.html?race_id=${raceId}`,
    };
    races.push(race);

    if (!venueMeta.has(meta.venueId)) {
      venueMeta.set(meta.venueId, {
        venueId: meta.venueId,
        label: meta.venueLabel,
        kai: meta.kai,
        day: meta.day,
        totalDays: 0,
        isFinalDay: false,
        division: "",
        status: "open",
        defaultStage: 5,
        turfCondition,
        dirtCondition,
      });
    }
  }

  const venues = [...venueMeta.values()];
  const meetings =
    date && venues.length
      ? [{ date, venues }]
      : [];

  return {
    version: NETKEIBA_LIVE_PARSER_VERSION,
    source: "real-live",
    providerId: "real-race",
    updatedAt: new Date().toISOString(),
    date,
    kaisaiDate: String(kaisaiDate || "").replace(/-/g, ""),
    venues: Object.values(NETKEIBA_VENUE_BY_CODE).map((v) => ({
      venueId: v.venueId,
      label: v.label,
    })),
    meetings,
    races,
    raceCount: races.length,
  };
}

/**
 * 複数日分をマージ
 */
export function mergeRaceListPayloads(payloads = []) {
  const meetingsMap = new Map();
  const races = [];
  const venuesMap = new Map();
  let updatedAt = null;

  for (const p of payloads) {
    if (!p || !Array.isArray(p.races) || !p.races.length) continue;
    updatedAt = p.updatedAt || updatedAt;
    for (const v of p.venues || []) {
      venuesMap.set(v.venueId, v);
    }
    for (const m of p.meetings || []) {
      if (!m.date) continue;
      if (!meetingsMap.has(m.date)) {
        meetingsMap.set(m.date, { date: m.date, venues: [] });
      }
      const dest = meetingsMap.get(m.date);
      const seen = new Set(dest.venues.map((x) => x.venueId));
      for (const v of m.venues || []) {
        if (seen.has(v.venueId)) continue;
        dest.venues.push(v);
        seen.add(v.venueId);
      }
    }
    for (const r of p.races) {
      if (!r.date && p.date) r.date = p.date;
      races.push(r);
    }
  }

  // 重複除去
  const raceKeys = new Set();
  const uniqueRaces = [];
  for (const r of races) {
    const key = `${r.date}|${r.venueId}|${r.number}|${r.raceId || ""}`;
    if (raceKeys.has(key)) continue;
    raceKeys.add(key);
    uniqueRaces.push(r);
  }

  const meetings = [...meetingsMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, m]) => m);

  return {
    version: NETKEIBA_LIVE_PARSER_VERSION,
    source: "real-live",
    providerId: "real-race",
    updatedAt: updatedAt || new Date().toISOString(),
    venues: [...venuesMap.values()],
    meetings,
    races: uniqueRaces,
    raceCount: uniqueRaces.length,
  };
}

/**
 * shutuba markdown → entries raw JSON
 */
export function parseShutubaMarkdown(text = "", options = {}) {
  const raceMeta = extractRaceHeader(text, options.raceId);
  const entries = [];
  const lines = String(text || "").split(/\r?\n/);

  for (const line of lines) {
    if (!/^\|\s*\d+\s*\|\s*\d+\s*\|/.test(line)) continue;
    if (!line.includes("db.netkeiba.com/horse/")) continue;

    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter((c, i, arr) => !(i === 0 && c === "") && !(i === arr.length - 1 && c === ""));

    if (cols.length < 8) continue;
    const frame = Number(cols[0]);
    const number = Number(cols[1]);
    if (!Number.isFinite(frame) || !Number.isFinite(number)) continue;

    const horseCell = cols[3] || "";
    const horseName =
      (horseCell.match(/"([^"]+)"/) || [])[1] ||
      (horseCell.match(/\[([^\]!]+)/) || [])[1] ||
      "";
    const horseIdMatch = horseCell.match(/horse\/(\d+)/);
    const sexAge = String(cols[4] || "");
    const sexMatch = sexAge.match(/([牡牝セ])\s*(\d+)/);
    const weight = Number(cols[5]);
    const jockeyCell = cols[6] || "";
    const jockey =
      (jockeyCell.match(/\[([^\]]+)\]/) || [])[1] ||
      jockeyCell.replace(/!\[.*?\]\(.*?\)/g, "").trim();
    const trainerCell = cols[7] || "";
    const affiliation = (trainerCell.match(/^(美浦|栗東)/) || [])[1] || "";
    const trainer =
      (trainerCell.match(/\[([^\]]+)\]/) || [])[1] ||
      trainerCell.replace(/美浦|栗東/g, "").replace(/[\[\]]/g, "").trim();
    const bodyWeightCell = cols[8] || "";
    const bodyWeight = Number(String(bodyWeightCell).replace(/\(.*$/, ""));
    const odds = Number(cols[9]);
    const popularity = Number(cols[10]);

    if (!horseName || !number) continue;

    entries.push({
      horseId: horseIdMatch?.[1] || `H${String(number).padStart(4, "0")}`,
      horseName: horseName.trim(),
      number,
      frame,
      sex: sexMatch?.[1] || "",
      age: sexMatch ? Number(sexMatch[2]) : null,
      weight: Number.isFinite(weight) ? weight : null,
      carriedWeight: Number.isFinite(weight) ? weight : null,
      jockey: jockey || "",
      trainer: trainer || "",
      affiliation,
      entryStatus: "confirmed",
      runningStyle: "",
      lastRace: "",
      last3: [],
      winRate: 0,
      placeRate: 0,
      grade: "",
      stars: 0,
      trackType: raceMeta.surface || "",
      distanceType: "",
      popularity: Number.isFinite(popularity) ? popularity : null,
      odds: Number.isFinite(odds) ? odds : null,
      bodyWeight: Number.isFinite(bodyWeight) ? bodyWeight : null,
    });
  }

  return {
    version: NETKEIBA_LIVE_PARSER_VERSION,
    source: "real-live",
    providerId: "real-horse",
    raceDate: options.raceDate || raceMeta.date || null,
    venueId: options.venueId || raceMeta.venueId || null,
    raceNumber: options.raceNumber || raceMeta.number || null,
    raceId: options.raceId || raceMeta.raceId || null,
    raceName: raceMeta.raceName || null,
    defaultStage: 5,
    updatedAt: new Date().toISOString(),
    entries,
    entryCount: entries.length,
    meta: raceMeta,
  };
}

/**
 * odds markdown → odds raw JSON
 */
export function parseOddsMarkdown(text = "", options = {}) {
  const raceMeta = extractRaceHeader(text, options.raceId);
  const winMap = new Map();
  const placeMap = new Map();

  const lines = String(text || "").split(/\r?\n/);
  let section = "";

  for (const line of lines) {
    if (/^##/.test(line) && /単勝/.test(line)) {
      section = "win";
      continue;
    }
    if (/^##/.test(line) && /複勝/.test(line)) {
      section = "place";
      continue;
    }
    if (/^##\s+/.test(line)) {
      section = "";
      continue;
    }
    if (!section) continue;
    if (!/^\|\s*\d+\s*\|\s*\d+\s*\|/.test(line)) continue;

    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter((c, i, arr) => !(i === 0 && c === "") && !(i === arr.length - 1 && c === ""));
    if (cols.length < 5) continue;

    const number = Number(cols[1]);
    // 単勝表: 枠|馬番|印|選択|馬名|オッズ
    const nameCell = cols.length >= 6 ? cols[4] : cols[3];
    const horseName =
      (String(nameCell).match(/\[([^\]]+)\]/) || [])[1] ||
      String(nameCell).replace(/- \[x\]/g, "").trim();
    const oddsVal = Number(cols[cols.length - 1]);
    if (!Number.isFinite(number) || !Number.isFinite(oddsVal)) continue;

    if (section === "win") {
      winMap.set(number, {
        number,
        horseName: horseName || `馬${number}`,
        winOdds: oddsVal,
      });
    } else if (section === "place") {
      placeMap.set(number, oddsVal);
    }
  }

  const odds = [...winMap.values()]
    .map((w) => ({
      number: w.number,
      horse: w.horseName,
      horseName: w.horseName,
      winOdds: w.winOdds,
      placeOdds: placeMap.has(w.number) ? placeMap.get(w.number) : null,
      popularity: null,
      marketIndex: null,
      updatedAt: new Date().toISOString(),
      history: [],
    }))
    .sort((a, b) => a.number - b.number);

  // 人気順を付与
  const byOdds = [...odds].sort(
    (a, b) => (a.winOdds || 9999) - (b.winOdds || 9999)
  );
  byOdds.forEach((o, i) => {
    const target = odds.find((x) => x.number === o.number);
    if (target) target.popularity = i + 1;
  });

  return {
    version: NETKEIBA_LIVE_PARSER_VERSION,
    source: "real-live",
    providerId: "real-odds",
    providerName: "Real Odds (netkeiba)",
    raceDate: options.raceDate || raceMeta.date || null,
    venueId: options.venueId || raceMeta.venueId || null,
    raceNumber: options.raceNumber || raceMeta.number || null,
    raceId: options.raceId || raceMeta.raceId || null,
    phase: "final",
    updatedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    odds,
    oddsCount: odds.length,
    meta: raceMeta,
  };
}

function extractRaceHeader(text = "", raceId = "") {
  const meta = parseNetkeibaRaceId(raceId) || {};
  const titleMatch = String(text).match(
    /(\d{4})年(\d{1,2})月(\d{1,2})日\s*(札幌|函館|福島|新潟|東京|中山|中京|京都|阪神|小倉)/
  );
  const nameMatch = String(text).match(/^#\s*(.+)$/m);
  const infoMatch = String(text).match(
    /(\d{1,2}:\d{2})発走\s*\/\s*(芝|ダ|障)(\d+)m/
  );
  const weatherMatch = String(text).match(/天候[：:]([^\s/]+)/);
  const trackMatch = String(text).match(/馬場[：:]([^\s/]+)/);
  const kaiMatch = String(text).match(/(\d+)回\s*(札幌|函館|福島|新潟|東京|中山|中京|京都|阪神|小倉)\s*(\d+)日目/);

  const venueLabelMap = {
    札幌: "sapporo",
    函館: "hakodate",
    福島: "fukushima",
    新潟: "niigata",
    東京: "tokyo",
    中山: "nakayama",
    中京: "chukyo",
    京都: "kyoto",
    阪神: "hanshin",
    小倉: "kokura",
  };
  const venueLabel =
    titleMatch?.[4] || kaiMatch?.[2] || meta.venueLabel || "";
  const venueId = venueLabelMap[venueLabel] || meta.venueId || null;

  let date = null;
  if (titleMatch) {
    date = `${titleMatch[1]}-${String(titleMatch[2]).padStart(2, "0")}-${String(titleMatch[3]).padStart(2, "0")}`;
  }

  return {
    raceId: meta.raceId || raceId || null,
    date,
    venueId,
    venueLabel,
    number: meta.number || null,
    kai: Number(kaiMatch?.[1]) || meta.kai || null,
    day: Number(kaiMatch?.[3]) || meta.day || null,
    raceName: (nameMatch?.[1] || "").replace(/!\[.*?\]\(.*?\)/g, "").trim(),
    startTime: infoMatch?.[1] || null,
    surface: mapSurface(infoMatch?.[2]),
    distance: infoMatch ? Number(infoMatch[3]) : null,
    weather: weatherMatch?.[1] || "",
    trackCondition: trackMatch?.[1] || "",
  };
}

export const NetkeibaLiveParser = {
  parseRaceList: parseRaceListMarkdown,
  mergeRaceLists: mergeRaceListPayloads,
  parseShutuba: parseShutubaMarkdown,
  parseOdds: parseOddsMarkdown,
  version: NETKEIBA_LIVE_PARSER_VERSION,
};
