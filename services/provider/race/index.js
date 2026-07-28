/* ========================================
   Real Race Calendar Provider API — Ver10.0
   ======================================== */

export {
  RealRaceProvider,
  loadRealRaceCalendar,
  RealRaceProviderApi,
  REAL_RACE_PROVIDER_ID,
  REAL_RACE_PROVIDER_VERSION,
} from "./real-race-provider.js";

export {
  RaceCalendarFetcher,
  fetchRaceCalendarRaw,
  RACE_CALENDAR_FETCHER_VERSION,
} from "./race-calendar-fetcher.js";

export {
  RaceCalendarParser,
  parseRaceCalendarRaw,
  RACE_CALENDAR_PARSER_VERSION,
} from "./race-calendar-parser.js";

export {
  RaceCalendarNormalizer,
  normalizeRaceCalendar,
  compareRaceOrder,
  RACE_CALENDAR_NORMALIZER_VERSION,
} from "./race-calendar-normalizer.js";

export {
  RaceCalendarValidator,
  validateRaceCalendar,
  RACE_CALENDAR_VALIDATOR_VERSION,
} from "./race-calendar-validator.js";

export {
  RaceCalendarSynchronizer,
  syncRaceCalendar,
  getRealRaceState,
  clearRealRaceState,
  getRealRaceDashboard,
  listRealRacesFor,
  fingerprintRealCalendar,
  RACE_CALENDAR_SYNC_VERSION,
} from "./race-calendar-synchronizer.js";
