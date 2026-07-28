/* ========================================
   EventWatcher — Ver7.2
   Mock / Real 切替可能なイベント監視
   ======================================== */

import { priorityOf, reasonForEvent } from "./priorities.js";
import { nowIso } from "./utils.js";
import { MOCK_EVENTS, getMockEventCatalog } from "./mock-events.js";

const listeners = new Set();
let watchTargets = [
  "frame_confirmed",
  "jockey_change",
  "scratched",
  "excluded",
  "weight_change",
  "track_change",
  "weather_change",
  "wind_speed_change",
  "wind_direction_change",
  "moisture_updated",
  "odds_spike",
  "odds_updated",
  "popularity_changed",
  "market_index_updated",
  "meeting_update",
  "provider_update",
  "news_added",
  "news_updated",
  "news_scratch",
  "news_important",
  "stage_changed",
  "entry_added",
  "entry_scratched",
  "entry_status_changed",
];

export function getWatchTargets() {
  return [...watchTargets];
}

export function setWatchTargets(list) {
  if (Array.isArray(list) && list.length) {
    watchTargets = list.map(String);
  }
  return getWatchTargets();
}

export function subscribeEvents(fn) {
  if (typeof fn === "function") listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitEvent(raw = {}) {
  const type = raw.type || "meeting_update";
  const event = {
    id: raw.id || `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    priority: raw.priority || priorityOf(type),
    detail: raw.detail || "",
    reason: raw.reason || reasonForEvent(type, raw.detail || ""),
    payload: raw.payload || {},
    source: raw.source || "mock",
    timestamp: raw.timestamp || nowIso(),
  };
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch {
      /* ignore */
    }
  });
  return event;
}

/** Mock イベントを手動発火 */
export function fireMockEvent(type, detail = "") {
  const catalog = MOCK_EVENTS.find((e) => e.type === type);
  return emitEvent({
    type,
    detail: detail || catalog?.detail || "",
    payload: catalog?.payload || {},
    source: "mock",
  });
}

export function listMockEventTypes() {
  return getMockEventCatalog();
}

export const EventWatcher = {
  subscribe: subscribeEvents,
  emit: emitEvent,
  fireMock: fireMockEvent,
  getTargets: getWatchTargets,
  setTargets: setWatchTargets,
  listMockTypes: listMockEventTypes,
};
