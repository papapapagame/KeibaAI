/* ========================================
   PAPAPA IQ KEIBA - services/calendar API
   Ver7.1 Race Calendar Intelligence
   ======================================== */

export {
  loadCalendar,
  getCalendarDashboard,
  getVenuesOnDate,
  getSessionInfo,
  getRaceAnalysisContext,
  prepareAiInput,
  RaceCalendarEngine,
  getCalendarMode,
  setCalendarMode,
  listMeetingDates,
  isMeetingDate,
  getMeetingByDate,
  getDateRange,
  buildMonthCells,
  listVenuesForDate,
  getVenueSession,
  buildSession,
  buildSessionWithRaceStage,
  resolveRaceStage,
  validateDateSelection,
  validateVenueSelection,
  buildStageContext,
  sanitizeForStage,
} from "./race-calendar-engine.js";

export {
  RaceDateManager,
} from "./race-date-manager.js";

export {
  VenueManager,
} from "./venue-manager.js";

export {
  RaceSessionManager,
} from "./race-session-manager.js";

export {
  CalendarValidator,
} from "./calendar-validator.js";

export {
  ANALYSIS_STAGES,
  createRaceDate,
  createRaceVenue,
  createRaceSession,
  createAnalysisStage,
  createDataCompleteness,
  CALENDAR_MODEL_VERSION,
} from "./models.js";

export {
  getRealRaceState,
  getRealRaceDashboard,
} from "../provider/race/index.js";

export { StageEvaluation } from "./stage-evaluation.js";
export { CALENDAR_MODE_KEY, CALENDAR_MODES } from "./calendar-mode.js";
export {
  PAST_MEETING_RETENTION_WEEKS,
  jstTodayIso,
  addDaysIso,
  getRetentionCutoffIso,
  isWithinRetentionWindow,
  retentionBlockedMessage,
  RetentionWindow,
} from "./retention-window.js";
