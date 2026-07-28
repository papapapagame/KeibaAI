/* ========================================
   PAPAPA IQ KEIBA - Horse Collector
   Ver5.2 Real Intelligence Connect
   ======================================== */

/**
 * 馬情報収集
 * 馬番 / 馬名 / 性齢 / 斤量 / 騎手 / 調教師 / 所属 / 人気 / オッズ
 */
export function collectHorses(rawList = [], options = {}) {
  const source = options.source || "unknown";
  const list = Array.isArray(rawList) ? rawList : [];
  return list.map((raw) => collectHorse(raw, source));
}

export function collectHorse(raw = {}, source = "unknown") {
  const name = pick(raw, ["horse", "name", "horseName", "bamei"]) || "";
  const number = toNum(pick(raw, ["number", "umaban", "horseNumber"]));
  return {
    type: "horse",
    number,
    name,
    sexAge: pick(raw, ["sexAge", "sex_age", "性齢", "ageSex"]) || "",
    weight: toNum(pick(raw, ["weight", "kinryo", "burdenWeight", "斤量"])),
    jockey: pick(raw, ["jockey", "kisyu", "騎手"]) || "",
    trainer: pick(raw, ["trainer", "chokyoshi", "調教師"]) || "",
    affiliation:
      pick(raw, ["affiliation", "stable", "shozoku", "所属"]) || "",
    popularity: toNum(pick(raw, ["popularity", "ninki", "人気"])),
    odds: toNum(pick(raw, ["odds", "winOdds", "オッズ"])),
    frame: toNum(pick(raw, ["frame", "waku"])),
    runningStyle: pick(raw, ["runningStyle", "kyakushitsu"]) || "",
    source,
  };
}

/**
 * 馬エントリからオッズ共通形式も生成
 */
export function collectOddsFromHorses(horses = [], raceId = "", source = "unknown") {
  return (Array.isArray(horses) ? horses : []).map((h) => ({
    type: "odds",
    raceId,
    horseNumber: h.number,
    win: h.odds,
    place: null,
    updatedAt: new Date().toISOString(),
    source,
  }));
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
