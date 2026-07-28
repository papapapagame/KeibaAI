/* ========================================
   Data Providers registry — Ver7.0
   ======================================== */

import { MockProvider } from "./mock-provider.js";
import {
  JraProvider,
  NetkeibaProvider,
  JbisProvider,
  KeibalabProvider,
  MarketProvider,
  NewsProvider,
  SocialProvider,
} from "./stubs.js";
import { PROVIDER_STATUS } from "./base-provider.js";

export { PROVIDER_STATUS };
export { MockProvider };
export {
  JraProvider,
  NetkeibaProvider,
  JbisProvider,
  KeibalabProvider,
  MarketProvider,
  NewsProvider,
  SocialProvider,
};

const FACTORIES = {
  mock: () => new MockProvider(),
  jra: () => new JraProvider(),
  netkeiba: () => new NetkeibaProvider(),
  jbis: () => new JbisProvider(),
  keibalab: () => new KeibalabProvider(),
  market: () => new MarketProvider(),
  news: () => new NewsProvider(),
  social: () => new SocialProvider(),
};

export function createAllProviders() {
  return Object.keys(FACTORIES).map((id) => FACTORIES[id]());
}

export function createProvider(id) {
  const factory = FACTORIES[id];
  if (!factory) return null;
  return factory();
}

export function listProviderIds() {
  return Object.keys(FACTORIES);
}
