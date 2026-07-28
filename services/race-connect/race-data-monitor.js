/* ========================================
   Race Data Monitor — Ver7.5
   ======================================== */

export const RACE_CONNECT_VERSION = "7.5.0";

const state = {
  status: "idle", // idle | connecting | synced | error | blocked
  successCount: 0,
  failCount: 0,
  syncStatus: "idle", // idle | syncing | synced | skipped | error
  lastUpdatedAt: null,
  lastProviderId: null,
  lastMessage: "",
  lastCount: { meetings: 0, races: 0 },
  lastValidation: null,
};

export function getRaceConnectMonitor() {
  return { ...state, version: RACE_CONNECT_VERSION };
}

export function markConnecting(providerId = null) {
  state.status = "connecting";
  state.syncStatus = "syncing";
  state.lastProviderId = providerId;
  state.lastMessage = "connecting";
  return getRaceConnectMonitor();
}

export function markSuccess({
  providerId,
  count,
  validation,
  message = "ok",
  synced = true,
} = {}) {
  state.status = "synced";
  state.successCount += 1;
  state.lastUpdatedAt = new Date().toISOString();
  state.lastProviderId = providerId || state.lastProviderId;
  state.lastMessage = message;
  state.lastCount = {
    meetings: Number(count?.meetings) || 0,
    races: Number(count?.races) || 0,
  };
  state.lastValidation = validation || null;
  state.syncStatus = synced ? "synced" : "skipped";
  return getRaceConnectMonitor();
}

export function markFailure({ message, blocked = false, providerId = null } = {}) {
  state.status = blocked ? "blocked" : "error";
  state.failCount += 1;
  state.lastUpdatedAt = new Date().toISOString();
  state.lastProviderId = providerId || state.lastProviderId;
  state.lastMessage = message || "error";
  state.syncStatus = "error";
  return getRaceConnectMonitor();
}

export function markSyncSkipped(reason = "no change") {
  state.syncStatus = "skipped";
  state.lastMessage = reason;
  return getRaceConnectMonitor();
}

export function resetRaceConnectMonitor() {
  state.status = "idle";
  state.successCount = 0;
  state.failCount = 0;
  state.syncStatus = "idle";
  state.lastUpdatedAt = null;
  state.lastProviderId = null;
  state.lastMessage = "";
  state.lastCount = { meetings: 0, races: 0 };
  state.lastValidation = null;
  return getRaceConnectMonitor();
}

export const RaceDataMonitor = {
  get: getRaceConnectMonitor,
  connecting: markConnecting,
  success: markSuccess,
  failure: markFailure,
  skip: markSyncSkipped,
  reset: resetRaceConnectMonitor,
  version: RACE_CONNECT_VERSION,
};
