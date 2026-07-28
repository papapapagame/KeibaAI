/* ========================================
   PAPAPA IQ KEIBA - History Collector
   Ver5.2 Real Intelligence Connect
   着順 / 距離 / タイム / 上がり / 開催 / クラス
   ======================================== */

/**
 * @param {any[]} rawList history feed entries or horse entries with lastRace
 */
export function collectHistory(rawList = [], options = {}) {
  const source = options.source || "unknown";
  const list = Array.isArray(rawList) ? rawList : [];
  const out = [];

  for (const entry of list) {
    if (Array.isArray(entry.results)) {
      for (const row of entry.results) {
        out.push(
          collectHistoryRow(
            {
              ...row,
              horseNumber: entry.horseNumber || entry.number,
              horseName: entry.horseName || entry.name || entry.horse,
            },
            source
          )
        );
      }
      continue;
    }

    // horses.json の lastRace 文字列から可能な範囲で抽出
    if (entry.lastRace) {
      out.push(parseLastRaceString(entry, source));
    }
  }

  return out.filter(Boolean);
}

export function collectHistoryRow(raw = {}, source = "unknown") {
  return {
    type: "history",
    horseNumber: toNum(pick(raw, ["horseNumber", "number", "umaban"])),
    horseName: pick(raw, ["horseName", "name", "horse"]) || "",
    finish: toNum(pick(raw, ["finish", "chakujun", "着順", "place"])),
    distance: toNum(pick(raw, ["distance", "kyori", "距離"])),
    time: pick(raw, ["time", "raceTime", "タイム"]) || "",
    last3f: pick(raw, ["last3f", "agari", "上がり", "lastFurlong"]) || "",
    venue: pick(raw, ["venue", "venueLabel", "開催", "courseName"]) || "",
    className: pick(raw, ["className", "class", "クラス", "grade"]) || "",
    source,
  };
}

/**
 * 例: "1着 / 東京芝1600"
 */
function parseLastRaceString(entry, source) {
  const text = String(entry.lastRace || "");
  const finishMatch = text.match(/(\d+)\s*着/);
  const distMatch = text.match(/(\d{3,4})\s*$/);
  const venueMatch = text.match(/\/\s*([^\d芝ダ]+)/);
  const trackMatch = text.includes("ダ") ? "ダート" : text.includes("芝") ? "芝" : "";

  return {
    type: "history",
    horseNumber: toNum(entry.number),
    horseName: entry.horse || entry.name || "",
    finish: finishMatch ? Number(finishMatch[1]) : null,
    distance: distMatch ? Number(distMatch[1]) : null,
    time: "",
    last3f: "",
    venue: venueMatch ? venueMatch[1].replace(/芝|ダート|ダ/g, "").trim() : "",
    className: "",
    track: trackMatch,
    source,
    raw: text,
  };
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
