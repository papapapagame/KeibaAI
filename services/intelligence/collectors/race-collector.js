/* ========================================
   PAPAPA IQ KEIBA - Race Collector
   Ver5.2 Real Intelligence Connect
   ======================================== */

/**
 * レース情報を共通収集形式へ
 * 開催日 / 競馬場 / レース番号 / レース名 / 距離 / 芝・ダート / 馬場状態 / 発走時刻
 */
export function collectRaces(rawList = [], options = {}) {
  const source = options.source || "unknown";
  const list = Array.isArray(rawList) ? rawList : [];
  return list.map((raw) => collectRace(raw, source));
}

export function collectRace(raw = {}, source = "unknown") {
  return {
    type: "race",
    date: pick(raw, ["date", "raceDate", "kaisaiDate"]) || "",
    venue: pick(raw, ["venue", "venueCode", "courseCode"]) || "",
    venueLabel: pick(raw, ["venueLabel", "courseName", "競馬場"]) || "",
    number: toNum(pick(raw, ["number", "raceNumber", "raceNo"])),
    name: pick(raw, ["name", "raceName", "title"]) || "",
    distance: toNum(pick(raw, ["distance", "kyori"])),
    track: normalizeSurface(pick(raw, ["track", "surface", "trackType", "芝ダ"])),
    condition:
      pick(raw, ["condition", "trackCondition", "baba", "馬場状態"]) || "",
    time: pick(raw, ["time", "postTime", "startTime", "発走時刻"]) || "",
    weather: pick(raw, ["weather", "tenki"]) || "",
    grade: pick(raw, ["grade", "className"]) || "",
    source,
  };
}

function normalizeSurface(value) {
  const s = String(value || "");
  if (!s) return "";
  if (s.includes("ダ")) return "ダート";
  if (s.includes("芝")) return "芝";
  return s;
}

function pick(obj, keys) {
  for (const key of keys) {
    if (obj[key] != null && obj[key] !== "") return obj[key];
  }
  return null;
}

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
