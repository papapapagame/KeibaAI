/* ========================================
   TrackConditionParser — Ver10.3
   芝／ダート状態の正規化
   ======================================== */

export const TRACK_CONDITION_PARSER_VERSION = "10.3.0";

const TRACK_SET = new Set(["良", "稍重", "重", "不良", "未確定"]);

export function parseTrackCondition(raw = {}) {
  const surface = normalizeSurface(raw.surface || raw.track);
  const trackCondition = String(
    raw.trackCondition || raw.condition || ""
  ).trim();
  const turfCondition = String(
    raw.turfCondition || (surface === "芝" ? trackCondition : "")
  ).trim();
  const dirtCondition = String(
    raw.dirtCondition || (surface === "ダート" ? trackCondition : "")
  ).trim();

  return {
    surface,
    trackCondition: TRACK_SET.has(trackCondition) ? trackCondition : trackCondition || null,
    turfCondition: turfCondition || null,
    dirtCondition: dirtCondition || null,
    surfaceState:
      raw.surfaceState ||
      deriveSurfaceState(trackCondition) ||
      null,
    moisture:
      raw.moisture != null && Number.isFinite(Number(raw.moisture))
        ? Number(raw.moisture)
        : null,
    moistureAvailable: Boolean(
      raw.moistureAvailable ||
        (raw.moisture != null && Number.isFinite(Number(raw.moisture)))
    ),
    version: TRACK_CONDITION_PARSER_VERSION,
  };
}

function normalizeSurface(v) {
  const s = String(v || "").toLowerCase();
  if (s === "ダ" || s === "dirt" || s === "ダート") return "ダート";
  if (s === "turf" || s === "芝") return "芝";
  if (!v) return "芝";
  return String(v);
}

function deriveSurfaceState(trackCondition) {
  const map = {
    良: "標準",
    稍重: "やや重い",
    重: "重い",
    不良: "悪化",
  };
  return map[trackCondition] || null;
}

export const TrackConditionParser = {
  parse: parseTrackCondition,
  version: TRACK_CONDITION_PARSER_VERSION,
};
