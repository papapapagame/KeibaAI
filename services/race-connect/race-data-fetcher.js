/* ========================================
   Race Data Fetcher — Ver7.5
   Provider Framework 経由のみ（直アクセス禁止）
   Race 情報のみ対象（Horse / Odds は対象外）
   ======================================== */

import { acquire, acquireBundle } from "../provider/index.js";
import { getSourceMode } from "../data/source-mode.js";
import { API_BASE_URL } from "../../js/config.js";

/**
 * Race 一覧・開催情報を Framework 経由で取得
 * Bundle を主経路とし、Race 単体は補助（一覧が無い場合）
 */
export async function fetchRaceConnectRaw(options = {}) {
  const mode = options.mode || getSourceMode();

  let acquired = await acquireBundle({ ...options, mode });
  if (!acquired.ok) {
    acquired = await acquire("Race", { ...options, mode });
  }

  if (!acquired.ok) {
    return {
      ok: false,
      blocked: Boolean(acquired.blocked),
      message: acquired.message || "Provider未接続",
      providerId: acquired.providerId,
      mode,
      raw: null,
      provenance: acquired.provenance || null,
      framework: acquired.framework || null,
    };
  }

  const raw = stripToRaceOnly(acquired.raw || acquired.data || {});

  // Mock / Auto: 開催回・日数などはカレンダー JSON から付与（Horse は使わない）
  if (
    (acquired.providerId || "mock") === "mock" ||
    mode === "mock" ||
    mode === "auto"
  ) {
    const calendarHint = await fetchCalendarHintOptional();
    return {
      ok: true,
      blocked: false,
      message: acquired.message || "Race Connect fetch ok",
      providerId: acquired.providerId || "mock",
      mode,
      raw: {
        ...raw,
        calendarHint,
      },
      provenance: acquired.provenance || null,
      framework: acquired.framework || null,
      sourceLabel: acquired.sourceLabel,
      fetchedAt: acquired.fetchedAt,
    };
  }

  return {
    ok: true,
    blocked: false,
    message: acquired.message || "Race Connect fetch ok",
    providerId: acquired.providerId,
    mode,
    raw,
    provenance: acquired.provenance || null,
    framework: acquired.framework || null,
    sourceLabel: acquired.sourceLabel,
    fetchedAt: acquired.fetchedAt,
  };
}

/** Horse / Odds を AI・Connect パイプラインから除外 */
function stripToRaceOnly(raw = {}) {
  // acquire("Race") が単体オブジェクトを返す場合
  const asRace =
    !raw.races &&
    !raw.race &&
    (raw.number != null || raw.name || raw.raceName)
      ? raw
      : null;

  const race = raw.race
    ? { ...raw.race }
    : asRace
      ? { ...asRace }
      : null;
  const races = Array.isArray(raw.races)
    ? raw.races.map((r) => ({ ...r }))
    : race
      ? [{ ...race }]
      : [];
  const venues = Array.isArray(raw.venues)
    ? raw.venues.map((v) => ({ ...v }))
    : [];

  return {
    race,
    races,
    venues,
    settings: raw.settings || {},
    date: raw.date || race?.date || races[0]?.date || "",
  };
}

async function fetchCalendarHintOptional() {
  try {
    const res = await fetch(`${API_BASE_URL}calendar/mock-calendar.json`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const RaceDataFetcher = {
  fetch: fetchRaceConnectRaw,
};
