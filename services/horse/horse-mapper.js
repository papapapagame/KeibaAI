/* ========================================
   HorseMapper — Ver7.3
   ======================================== */

import { createHorse } from "../models/unified.js";

export function mapHorseFromProvider(providerId, raw = {}) {
  return createHorse(normalizeHorse(providerId, raw));
}

export function mapHorsesFromProvider(providerId, list = []) {
  return (list || []).map((h) => mapHorseFromProvider(providerId, h));
}

function normalizeHorse(providerId, raw) {
  switch (providerId) {
    case "jra":
      return {
        ...raw,
        number: raw.umaban || raw.number,
        frame: raw.wakuban || raw.frame,
        horseName: raw.bamei || raw.horseName || raw.horse,
        jockey: raw.kishumei || raw.jockey,
        trainer: raw.chokyoshimei || raw.trainer,
        weight: raw.futan || raw.weight,
        odds: raw.tanshoOdds || raw.odds,
        popularity: raw.ninki || raw.popularity,
        sex: raw.seibetsu || raw.sex,
        age: raw.barei || raw.age,
        runningStyle: raw.kyakushitsu || raw.runningStyle,
      };
    case "netkeiba":
      return {
        ...raw,
        number: raw.umaban || raw.number,
        frame: raw.waku || raw.frame,
        horseName: raw.horse_name || raw.horseName || raw.horse,
        jockey: raw.jockey_name || raw.jockey,
        trainer: raw.trainer_name || raw.trainer,
        weight: raw.kinryo || raw.weight,
        odds: raw.odds,
        popularity: raw.ninki || raw.popularity,
        sex: raw.sex,
        age: raw.age,
        runningStyle: raw.style || raw.runningStyle,
      };
    case "jbis":
      return {
        ...raw,
        number: raw.horseNumber || raw.number,
        frame: raw.bracket || raw.frame,
        horseName: raw.horseName || raw.horse,
        jockey: raw.jockeyName || raw.jockey,
        trainer: raw.trainerName || raw.trainer,
        weight: raw.carriedWeight || raw.weight,
        odds: raw.winOdds || raw.odds,
        popularity: raw.popularity,
        sex: raw.sex,
        age: raw.age,
        runningStyle: raw.runningStyle,
      };
    default:
      return {
        ...raw,
        horseName: raw.horseName || raw.horse || raw.name,
        jockey: raw.jockey,
        trainer: raw.trainer,
      };
  }
}

export const HorseMapper = {
  map: mapHorseFromProvider,
  mapMany: mapHorsesFromProvider,
};
