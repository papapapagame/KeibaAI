/* ========================================
   PAPAPA IQ KEIBA - services/providers/dummy-provider.js
   Ver5.1 DummyProvider（現行 data/*.json）
   ======================================== */

import { API_BASE_URL } from "../../js/config.js";
import { BaseProvider } from "./base-provider.js";
import { createHorseModel, createRaceModel } from "../models.js";

export class DummyProvider extends BaseProvider {
  constructor() {
    super("dummy", "Dummy Data");
  }

  async fetchBundle(options = {}) {
    const [raceJson, horsesJson, settingsJson] = await Promise.all([
      loadRawJson("race"),
      loadRawJson("horses"),
      loadRawJson("settings"),
    ]);

    const raceNumber = Number(options.raceNumber) || 0;
    const rawRace =
      (raceJson.races || []).find((r) => r.number === raceNumber) ||
      (raceJson.races || [])[0] ||
      {};

    const horseModels = (horsesJson.entries || []).map((entry) =>
      createHorseModel(entry)
    );
    const raceModel = createRaceModel(rawRace, horseModels);

    return {
      provider: this.getMeta(),
      venues: raceJson.venues || [],
      races: (raceJson.races || []).map((r) => createRaceModel(r, [])),
      race: raceModel,
      horses: horseModels,
      settings: settingsJson || {},
      fetchedAt: new Date().toISOString(),
      count: {
        races: (raceJson.races || []).length,
        horses: horseModels.length,
      },
    };
  }
}

async function loadRawJson(endpoint) {
  const url = `${API_BASE_URL}${endpoint}.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`DummyProvider failed: ${url} (${response.status})`);
  }
  return response.json();
}
