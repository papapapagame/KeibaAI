/* ========================================
   netkeiba 公開ページ ユーティリティ
   ======================================== */

export const NETKEIBA_VENUE_BY_CODE = {
  "01": { venueId: "sapporo", label: "札幌" },
  "02": { venueId: "hakodate", label: "函館" },
  "03": { venueId: "fukushima", label: "福島" },
  "04": { venueId: "niigata", label: "新潟" },
  "05": { venueId: "tokyo", label: "東京" },
  "06": { venueId: "nakayama", label: "中山" },
  "07": { venueId: "chukyo", label: "中京" },
  "08": { venueId: "kyoto", label: "京都" },
  "09": { venueId: "hanshin", label: "阪神" },
  "10": { venueId: "kokura", label: "小倉" },
};

export const NETKEIBA_CODE_BY_VENUE = Object.fromEntries(
  Object.entries(NETKEIBA_VENUE_BY_CODE).map(([code, v]) => [v.venueId, code])
);

/** 競馬場座標（Open-Meteo 用） */
export const VENUE_COORDINATES = {
  sapporo: { lat: 43.086, lon: 141.352, label: "札幌" },
  hakodate: { lat: 41.783, lon: 140.736, label: "函館" },
  fukushima: { lat: 37.764, lon: 140.479, label: "福島" },
  niigata: { lat: 37.95, lon: 139.185, label: "新潟" },
  tokyo: { lat: 35.663, lon: 139.485, label: "東京" },
  nakayama: { lat: 35.662, lon: 140.001, label: "中山" },
  chukyo: { lat: 35.066, lon: 136.992, label: "中京" },
  kyoto: { lat: 34.978, lon: 135.726, label: "京都" },
  hanshin: { lat: 34.729, lon: 135.362, label: "阪神" },
  kokura: { lat: 33.893, lon: 130.877, label: "小倉" },
};

/**
 * race_id (12桁) → メタ
 * YYYY + venue(2) + kai(2) + day(2) + race(2)
 */
export function parseNetkeibaRaceId(raceId) {
  const id = String(raceId || "").replace(/\D/g, "");
  if (id.length !== 12) return null;
  const year = id.slice(0, 4);
  const venueCode = id.slice(4, 6);
  const kai = Number(id.slice(6, 8)) || 0;
  const day = Number(id.slice(8, 10)) || 0;
  const number = Number(id.slice(10, 12)) || 0;
  const venue = NETKEIBA_VENUE_BY_CODE[venueCode] || {
    venueId: `v${venueCode}`,
    label: venueCode,
  };
  return {
    raceId: id,
    year,
    venueCode,
    venueId: venue.venueId,
    venueLabel: venue.label,
    kai,
    day,
    number,
  };
}

export function formatKaisaiDate(date = new Date()) {
  const d = toJstDate(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export function kaisaiToIso(kaisai) {
  const s = String(kaisai || "");
  if (!/^\d{8}$/.test(s)) return "";
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

export function toJstDate(input = new Date()) {
  const d = input instanceof Date ? input : new Date(input);
  // JST offset
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc + 9 * 60 * 60000);
}

/**
 * 直近・直近未来の開催候補日（土日中心 + 当日）
 */
export function candidateKaisaiDates(base = new Date(), options = {}) {
  const lookback = Number(options.lookbackDays) || 14;
  const lookahead = Number(options.lookaheadDays) || 10;
  const jst = toJstDate(base);
  const out = [];
  const seen = new Set();

  const push = (dt) => {
    const key = formatKaisaiDate(dt);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(key);
  };

  push(jst);

  for (let i = -lookback; i <= lookahead; i++) {
    const dt = new Date(jst.getTime());
    dt.setDate(jst.getDate() + i);
    const dow = dt.getDay(); // 0 Sun .. 6 Sat
    if (dow === 0 || dow === 6 || i === 0) push(dt);
  }

  // 当日前後の平日も少数追加（祝日開催対策）
  for (const offset of [-1, 1, -2, 2, -3, 3]) {
    const dt = new Date(jst.getTime());
    dt.setDate(jst.getDate() + offset);
    push(dt);
  }

  return out;
}

export function buildRaceListUrl(kaisaiDate) {
  const d = String(kaisaiDate || formatKaisaiDate()).replace(/-/g, "");
  return `https://race.netkeiba.com/top/race_list_sub.html?kaisai_date=${d}`;
}

export function buildShutubaUrl(raceId) {
  return `https://race.netkeiba.com/race/shutuba.html?race_id=${raceId}`;
}

export function buildOddsUrl(raceId) {
  return `https://race.netkeiba.com/odds/index.html?type=b1&race_id=${raceId}`;
}

export function mapSurface(token) {
  const t = String(token || "");
  if (t.startsWith("障")) return "障";
  if (t.startsWith("ダ")) return "ダート";
  if (t.startsWith("芝")) return "芝";
  return t || "";
}

export function inferGrade(raceName = "", raceClass = "") {
  const s = `${raceName}${raceClass}`;
  if (/G[ⅠI]{3}|GI{3}|ＧⅠⅠⅠ|ＧIII/i.test(s) || /GIII|G3/.test(s)) return "S";
  if (/G[ⅠI]{2}|GII|ＧⅡ|G2/.test(s)) return "S";
  if (/G[ⅠI]|GI|ＧⅠ|G1/.test(s)) return "S";
  if (/オープン|OP/.test(s)) return "A";
  if (/3勝|2勝|1勝|未勝利|新馬/.test(s)) return "C";
  return "B";
}

export function wmoToWeatherLabel(code) {
  const c = Number(code);
  if (!Number.isFinite(c)) return "未確定";
  if (c === 0) return "晴";
  if (c <= 3) return "曇";
  if (c <= 48) return "霧";
  if (c <= 57) return "小雨";
  if (c <= 67) return "雨";
  if (c <= 77) return "雪";
  if (c <= 82) return "雨";
  if (c <= 86) return "雪";
  if (c >= 95) return "雨";
  return "曇";
}

export function precipToTrackCondition(precipMm, prevPrecipMm = 0) {
  const p = Number(precipMm) || 0;
  const prev = Number(prevPrecipMm) || 0;
  const total = p + prev * 0.5;
  if (total <= 0.2) return "良";
  if (total < 3) return "稍重";
  if (total < 10) return "重";
  return "不良";
}
