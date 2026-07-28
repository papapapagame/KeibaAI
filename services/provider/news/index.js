/* ========================================
   Real News Provider API — Ver10.4
   ======================================== */

export {
  RealNewsProvider,
  loadRealNews,
  RealNewsProviderApi,
  REAL_NEWS_PROVIDER_ID,
  REAL_NEWS_PROVIDER_VERSION,
} from "./real-news-provider.js";

export {
  NewsFetcher,
  fetchNewsRawData,
  NEWS_FETCHER_VERSION,
} from "./news-fetcher.js";

export {
  NewsParser,
  parseNewsRaw,
  NEWS_PARSER_VERSION,
} from "./news-parser.js";

export {
  NewsMetadataExtractor,
  extractNewsMetadata,
  NEWS_METADATA_EXTRACTOR_VERSION,
} from "./news-metadata-extractor.js";

export {
  NewsNormalizer,
  normalizeRealNews,
  fingerprintNewsItems,
  computeNewsScore,
  NEWS_NORMALIZER_VERSION,
} from "./news-normalizer.js";

export {
  NewsValidator,
  validateRealNews,
  NEWS_PROVIDER_VALIDATOR_VERSION,
} from "./news-validator.js";

export {
  NewsSynchronizer,
  syncRealNews,
  getRealNewsState,
  clearRealNewsState,
  getRealNewsDashboard,
  fingerprintRealNews,
  getNewsUpdateCount,
  NEWS_PROVIDER_SYNC_VERSION,
} from "./news-synchronizer.js";
