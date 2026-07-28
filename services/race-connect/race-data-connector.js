/* ========================================
   Race Data Connector — Ver7.5
   Provider → Normalizer → Validator → Unified → AI
   ======================================== */

import { fetchRaceConnectRaw } from "./race-data-fetcher.js";
import {
  parseRaceConnectRaw,
  validateRaceConnectData,
  toUnifiedRaces,
  fingerprintRaceConnect,
} from "./race-data-parser.js";
import {
  syncRaceConnectToCalendar,
  getLastRaceFingerprint,
  setLastRaceFingerprint,
  getRaceConnectOverlay,
} from "./race-data-synchronizer.js";
import {
  markConnecting,
  markSuccess,
  markFailure,
  getRaceConnectMonitor,
  RACE_CONNECT_VERSION,
} from "./race-data-monitor.js";
import { getSourceMode } from "../data/source-mode.js";

/**
 * Race 情報のみ接続（Horse / Odds 対象外）
 */
export async function connectRaceData(options = {}) {
  const mode = options.mode || getSourceMode();
  markConnecting(null);

  const fetched = await fetchRaceConnectRaw({ ...options, mode });
  if (!fetched.ok || !fetched.raw) {
    markFailure({
      message: fetched.message || "取得失敗",
      blocked: Boolean(fetched.blocked),
      providerId: fetched.providerId,
    });
    return {
      ok: false,
      blocked: Boolean(fetched.blocked),
      message: fetched.message || "Provider未接続",
      providerId: fetched.providerId,
      mode,
      version: RACE_CONNECT_VERSION,
      races: [],
      meetings: [],
      unified: [],
      validation: {
        ok: false,
        errors: [{ code: "FETCH", message: fetched.message || "fetch failed" }],
        warnings: [],
      },
      monitor: getRaceConnectMonitor(),
      provenance: fetched.provenance || null,
      framework: fetched.framework || null,
    };
  }

  // Normalizer (Parser)
  const parsed = parseRaceConnectRaw(fetched.raw, fetched.providerId || "mock");

  // Validator — 失敗時は AI へ渡さない
  const validation = validateRaceConnectData(parsed);
  if (!validation.ok) {
    markFailure({
      message: validation.errors.map((e) => e.message).join("; "),
      providerId: fetched.providerId,
    });
    return {
      ok: false,
      blocked: false,
      message: "Validation failed",
      providerId: fetched.providerId,
      mode,
      version: RACE_CONNECT_VERSION,
      races: [],
      meetings: parsed.meetings || [],
      unified: [],
      validation,
      monitor: getRaceConnectMonitor(),
      provenance: fetched.provenance || null,
      framework: fetched.framework || null,
    };
  }

  const records = validation.sanitized;
  const unified = toUnifiedRaces(records);
  const fp = fingerprintRaceConnect(records);
  const prev = getLastRaceFingerprint();
  // forceRefresh は再取得のみ。内容同一なら changed=false（ループ防止）
  const contentChanged = fp !== prev;
  const needsWrite = contentChanged || !getRaceConnectOverlay();

  let syncResult = { changed: false, overlay: getRaceConnectOverlay(), fingerprint: fp };
  if (needsWrite) {
    syncResult = syncRaceConnectToCalendar(
      { ...parsed, races: records, providerId: fetched.providerId },
      {
        // デフォルトは通知しない。明示 emitUpdate:true のときのみ
        emitUpdate: options.emitUpdate === true && contentChanged && Boolean(prev),
        silent: options.silent === true || options.emitUpdate === false,
      }
    );
    setLastRaceFingerprint(fp);
    markSuccess({
      providerId: fetched.providerId,
      count: { meetings: parsed.meetings?.length || 0, races: records.length },
      validation,
      message: contentChanged ? "Race Connect synced" : "Race Connect written",
      synced: true,
    });
  } else {
    markSuccess({
      providerId: fetched.providerId,
      count: { meetings: parsed.meetings?.length || 0, races: records.length },
      validation,
      message: "Race Connect unchanged",
      synced: false,
    });
  }

  return {
    ok: true,
    blocked: false,
    message: contentChanged ? "Race data connected" : "Race data unchanged",
    providerId: fetched.providerId,
    sourceLabel: fetched.sourceLabel || `RaceConnect / ${fetched.providerId}`,
    mode,
    version: RACE_CONNECT_VERSION,
    changed: contentChanged,
    fingerprint: fp,
    races: records,
    meetings: parsed.meetings || [],
    unified,
    validation,
    sync: {
      status: contentChanged ? "synced" : "skipped",
      overlayUpdatedAt: syncResult.overlay?.updatedAt || null,
    },
    count: {
      meetings: parsed.meetings?.length || 0,
      races: records.length,
    },
    fetchedAt: fetched.fetchedAt || new Date().toISOString(),
    monitor: getRaceConnectMonitor(),
    provenance: fetched.provenance || null,
    framework: fetched.framework || null,
  };
}

/**
 * 開催情報更新時: Race のみ再取得（変更なしなら再分析不要）
 */
export async function refreshRaceDataOnly(options = {}) {
  return connectRaceData({
    ...options,
    forceRefresh: true,
    emitUpdate: false,
    silent: true,
  });
}

export function findConnectedRace(records, { date, venueId, raceNumber } = {}) {
  const list = records || getRaceConnectOverlay()?.races || [];
  const num = Number(raceNumber);
  return (
    list.find(
      (r) =>
        (!date || r.date === date) &&
        (!venueId || r.venueId === String(venueId).toLowerCase()) &&
        (!num || Number(r.number) === num)
    ) ||
    list.find((r) => !num || Number(r.number) === num) ||
    null
  );
}

export function getRaceConnectStatus() {
  const monitor = getRaceConnectMonitor();
  const overlay = getRaceConnectOverlay();
  return {
    ...monitor,
    overlayUpdatedAt: overlay?.updatedAt || null,
    overlayProviderId: overlay?.providerId || null,
    raceCount: overlay?.races?.length || monitor.lastCount?.races || 0,
    meetingCount: overlay?.meetings?.length || monitor.lastCount?.meetings || 0,
  };
}

export const RaceDataConnector = {
  connect: connectRaceData,
  refreshRaceOnly: refreshRaceDataOnly,
  findRace: findConnectedRace,
  status: getRaceConnectStatus,
  version: RACE_CONNECT_VERSION,
};
