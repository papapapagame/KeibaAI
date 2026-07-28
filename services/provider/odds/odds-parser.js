/* ========================================
   OddsParser — Ver10.2
   ======================================== */

export const ODDS_PARSER_VERSION = "10.2.0";

export function parseOddsRaw(raw = {}, providerId = "real-odds") {
  if (!raw || typeof raw !== "object") {
    return {
      providerId,
      items: [],
      meta: {},
      parsedAt: new Date().toISOString(),
      version: ODDS_PARSER_VERSION,
      empty: true,
    };
  }

  const list = Array.isArray(raw.odds)
    ? raw.odds
    : Array.isArray(raw.items)
      ? raw.items
      : Array.isArray(raw.horses)
        ? raw.horses
        : [];

  const items = list.map((o) => parseOddsRow(o));

  return {
    providerId,
    items,
    meta: {
      raceDate: raw.raceDate || raw.date || null,
      venueId: raw.venueId || raw.venue || null,
      raceNumber: raw.raceNumber != null ? Number(raw.raceNumber) : null,
      raceId: raw.raceId || raw.id || null,
      phase: raw.phase || "final",
      updatedAt: raw.updatedAt || null,
      fetchedAt: raw.fetchedAt || null,
      source: raw.source || "real",
      providerName: raw.providerName || providerId,
    },
    parsedAt: new Date().toISOString(),
    version: ODDS_PARSER_VERSION,
    empty: false,
  };
}

function parseOddsRow(o = {}) {
  const winOdds = Number(o.winOdds ?? o.odds ?? o.win);
  const placeOdds =
    o.placeOdds != null
      ? Number(o.placeOdds)
      : o.place != null
        ? Number(o.place)
        : null;
  const history = Array.isArray(o.history)
    ? o.history.map((h) => ({
        at: h.at || h.updatedAt || null,
        winOdds: Number(h.winOdds ?? h.odds) || null,
        placeOdds: h.placeOdds != null ? Number(h.placeOdds) : null,
        popularity: h.popularity != null ? Number(h.popularity) : null,
      }))
    : [];

  return {
    number: Number(o.number) || 0,
    horse: String(o.horse || o.horseName || o.name || ""),
    horseName: String(o.horseName || o.horse || o.name || ""),
    winOdds: Number.isFinite(winOdds) ? winOdds : null,
    placeOdds: Number.isFinite(placeOdds) ? placeOdds : null,
    popularity: o.popularity != null ? Number(o.popularity) : null,
    marketIndex: o.marketIndex != null ? Number(o.marketIndex) : null,
    updatedAt: o.updatedAt || null,
    fetchedAt: o.fetchedAt || null,
    history,
    providerName: o.providerName || null,
  };
}

export const OddsParser = {
  parse: parseOddsRaw,
  version: ODDS_PARSER_VERSION,
};
