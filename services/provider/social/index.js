/* ========================================
   Real Social Provider API — Ver10.5
   ======================================== */

export {
  RealSocialProvider,
  loadRealSocial,
  RealSocialProviderApi,
  REAL_SOCIAL_PROVIDER_ID,
  REAL_SOCIAL_PROVIDER_VERSION,
} from "./real-social-provider.js";

export {
  SocialFetcher,
  fetchSocialRawData,
  SOCIAL_FETCHER_VERSION,
} from "./social-fetcher.js";

export {
  SocialParser,
  parseSocialRaw,
  SOCIAL_PARSER_VERSION,
} from "./social-parser.js";

export {
  TrendMetadataExtractor,
  extractTrendMetadata,
  TREND_METADATA_EXTRACTOR_VERSION,
} from "./trend-metadata-extractor.js";

export {
  SocialNormalizer,
  normalizeRealSocial,
  fingerprintSocialItems,
  SOCIAL_NORMALIZER_VERSION,
} from "./social-normalizer.js";

export {
  SocialValidator,
  validateRealSocial,
  SOCIAL_PROVIDER_VALIDATOR_VERSION,
} from "./social-validator.js";

export {
  SocialSynchronizer,
  syncRealSocial,
  getRealSocialState,
  clearRealSocialState,
  getRealSocialDashboard,
  fingerprintRealSocial,
  getSocialUpdateCount,
  SOCIAL_PROVIDER_SYNC_VERSION,
} from "./social-synchronizer.js";
