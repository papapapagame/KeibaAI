/* ========================================
   Provider Factory — Ver7.4
   ======================================== */

import { MockProvider } from "./providers/mock-provider.js";
import { RealRaceProvider } from "./race/real-race-provider.js";
import { RealHorseProvider } from "./horse/real-horse-provider.js";
import { RealOddsProvider } from "./odds/real-odds-provider.js";
import {
  JraProvider,
  JbisProvider,
  NetkeibaProvider,
  KeibaLabProvider,
  MarketProvider,
  NewsProvider,
  SocialProvider,
} from "./providers/stubs.js";

const FACTORIES = {
  mock: () => new MockProvider(),
  "real-race": () => new RealRaceProvider(),
  "real-horse": () => new RealHorseProvider(),
  "real-odds": () => new RealOddsProvider(),
  jra: () => new JraProvider(),
  jbis: () => new JbisProvider(),
  netkeiba: () => new NetkeibaProvider(),
  keibalab: () => new KeibaLabProvider(),
  market: () => new MarketProvider(),
  news: () => new NewsProvider(),
  social: () => new SocialProvider(),
};

export function createProvider(id) {
  const key = String(id || "").toLowerCase();
  const factory = FACTORIES[key];
  if (!factory) return null;
  return factory();
}

export function createAllProviders() {
  return Object.keys(FACTORIES).map((id) => FACTORIES[id]());
}

export function listFactoryIds() {
  return Object.keys(FACTORIES);
}

export function hasFactory(id) {
  return Boolean(FACTORIES[String(id || "").toLowerCase()]);
}

export const ProviderFactory = {
  create: createProvider,
  createAll: createAllProviders,
  listIds: listFactoryIds,
  has: hasFactory,
};
