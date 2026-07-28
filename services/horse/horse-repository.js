/* ========================================
   HorseRepository — Ver7.3
   ======================================== */

import { fetchRaceBundle } from "../race/race-repository.js";

export async function fetchHorses(options = {}) {
  const bundle = await fetchRaceBundle(options);
  if (!bundle.ok) {
    return {
      ok: false,
      message: bundle.message,
      items: [],
      providerId: bundle.providerId,
    };
  }
  return {
    ok: true,
    message: bundle.message,
    items: bundle.raw?.horses || [],
    providerId: bundle.providerId,
  };
}

export const HorseRepository = { fetch: fetchHorses };
