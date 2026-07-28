/* ========================================
   PAPAPA IQ KEIBA - services/update API
   Ver7.2 Smart Update Engine
   ======================================== */

export {
  SmartUpdateEngine,
  startSmartUpdateEngine,
  stopSmartUpdateEngine,
  tickSchedule,
  getUpdateStatus,
  getUpdateDashboard,
  setAutoUpdate,
  getAutoUpdate,
  notifyStageChange,
  registerAnalysisHandler,
  registerContextProvider,
  resetUpdateEngineData,
} from "./smart-update-engine.js";

export { UpdateScheduler } from "./update-scheduler.js";
export { EventWatcher, fireMockEvent, listMockEventTypes } from "./event-watcher.js";
export { RefreshManager } from "./refresh-manager.js";
export { AnalysisTrigger } from "./analysis-trigger.js";
export {
  UpdateHistoryManager,
  loadUpdateHistory,
  appendUpdateLog,
  loadUpdateState,
  UPDATE_VERSION,
} from "./update-history-manager.js";

export {
  UPDATE_PRIORITY,
  priorityOf,
  reasonForEvent,
} from "./priorities.js";
