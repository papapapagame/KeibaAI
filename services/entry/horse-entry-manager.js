/* ========================================
   Horse Entry Manager — Ver7.6
   Analysis Stage に応じた登録馬フィルタ
   ======================================== */

import { connectEntryData, fingerprintEntries } from "./entry-data-connector.js";
import {
  syncEntries,
  getEntryOverlay,
  getLastEntryFingerprint,
  setLastEntryFingerprint,
} from "./entry-synchronizer.js";
import {
  setEntryState,
  getEntryStateSnapshot,
  computeEntryStats,
} from "./entry-state-manager.js";
import { ENTRY_STATUS, ENTRY_STATUS_LABEL } from "./entry-status.js";
import { ENTRY_ENGINE_VERSION } from "./entry-data-connector.js";
import { toLegacyHorse } from "../models/unified.js";
import {
  computeEntryCompleteness,
  confidenceFromEntryCompleteness,
} from "./entry-completeness.js";
import { formatEntryStagePanel } from "./horse-entry-formatter.js";

/**
 * 登録馬を取得し、Stage 用に整形して返す
 */
export async function loadEntriesForAi(options = {}) {
  const connected = await connectEntryData(options);
  if (!connected.ok) {
    setEntryState([], {
      syncStatus: "error",
      updatedAt: new Date().toISOString(),
    });
    return {
      ...connected,
      stats: computeEntryStats([]),
      entryCompleteness: computeEntryCompleteness([]),
      stagePanel: formatEntryStagePanel(options.stage || 0, null),
      sync: { status: "error" },
      forStage: [],
      legacyHorses: [],
    };
  }

  const prevFp = getLastEntryFingerprint();
  const fp = fingerprintEntries(connected.entries);
  const contentChanged = fp !== prevFp;

  const sync = syncEntries(connected.entries, {
    emitUpdate: options.emitUpdate === true && contentChanged && prevFp != null,
    silent: options.silent === true || options.emitUpdate === false,
    meta: connected.meta,
  });
  setLastEntryFingerprint(fp);
  setEntryState(connected.entries, {
    updatedAt: connected.fetchedAt,
    syncStatus: contentChanged ? "synced" : "skipped",
  });

  const stage = Number(options.stage ?? 0) || 0;
  const forStage = filterEntriesForStage(connected.entries, stage);
  const legacyHorses = forStage.map((e) =>
    toLegacyHorse(entryToHorseModel(e, stage))
  );

  const stats = computeEntryStats(connected.entries);
  const entryCompleteness = computeEntryCompleteness(connected.entries);
  const stagePanel = formatEntryStagePanel(stage, entryCompleteness);

  return {
    ok: true,
    blocked: false,
    message: contentChanged ? "Entry loaded" : "Entry unchanged",
    providerId: connected.providerId,
    version: ENTRY_ENGINE_VERSION,
    changed: contentChanged,
    fingerprint: fp,
    entries: connected.entries,
    unified: connected.unified,
    forStage,
    legacyHorses,
    validation: connected.validation,
    stats,
    entryCompleteness,
    stagePanel,
    sync: {
      status: contentChanged ? "synced" : "skipped",
      changes: sync.changes?.length || 0,
    },
    count: connected.count,
    fetchedAt: connected.fetchedAt,
    stage,
    stageNote: stageNote(stage),
    confidenceHint: confidenceFromEntryCompleteness(
      options.baseConfidence ?? 72,
      entryCompleteness
    ),
  };
}

/**
 * Stage1: 登録馬のみ
 * Stage2: Entry Expected（出走予定）
 * Stage3+: 取消・除外・回避を除き確定待ち
 */
export function filterEntriesForStage(entries = [], stage = 0) {
  const s = Number(stage) || 0;
  const list = entries || [];

  if (s < 1) return [];

  if (s === 1) {
    return list.filter((e) => e.entryStatus === ENTRY_STATUS.REGISTERED);
  }

  if (s === 2) {
    return list.filter((e) => e.entryStatus === ENTRY_STATUS.ENTRY_EXPECTED);
  }

  return list.filter(
    (e) =>
      e.entryStatus === ENTRY_STATUS.ENTRY_EXPECTED ||
      e.entryStatus === ENTRY_STATUS.CONFIRMED
  );
}

/**
 * 枠順・馬番・騎手・斤量・オッズは確定情報として渡さない
 */
export function entryToHorseModel(entry, stage = 0) {
  const s = Number(stage) || 0;
  return {
    horseId: entry.horseId,
    number: entry.number || 0, // AIエンジン互換の provisional key
    horseName: entry.horseName,
    horse: entry.horseName,
    age: entry.age,
    sex: entry.sex,
    trainer: entry.trainer,
    runningStyle: entry.runningStyle,
    lastRace: entry.lastRace,
    last3: entry.last3,
    winRate: entry.winRate,
    placeRate: entry.placeRate,
    grade: entry.grade,
    stars: entry.stars,
    trackType: entry.trackRecord,
    distanceType: entry.distanceRecord,
    entryStatus: entry.entryStatus,
    entryStatusLabel:
      entry.entryStatusLabel || ENTRY_STATUS_LABEL[entry.entryStatus],
    affiliation: entry.affiliation,
    careerRecord: entry.careerRecord,
    courseRecord: entry.courseRecord,
    stakesRecord: entry.stakesRecord,
    earnings: entry.earnings,
    scratched: entry.entryStatus === ENTRY_STATUS.SCRATCHED,
    excluded: entry.entryStatus === ENTRY_STATUS.EXCLUDED,
    frame: 0,
    jockey: "未定",
    weight: 55,
    odds: 99.9,
    popularity: 99,
    _frameUnconfirmed: true,
    _numberUnconfirmed: true,
    _jockeyUnconfirmed: true,
    _weightUnconfirmed: true,
    _oddsUnconfirmed: true,
    _entryProvisional: s < 3,
    _entryAwaitingConfirm: s >= 3,
  };
}

function stageNote(stage) {
  const s = Number(stage) || 0;
  if (s < 1) return "開催情報のみ（登録馬なし）";
  if (s === 1) return "登録馬情報のみ利用（枠/馬番/騎手/斤量/オッズは未確定）";
  if (s === 2) return "出走予定馬情報を利用（枠/馬番/騎手/斤量/オッズは未確定）";
  return "確定情報待機（枠・騎手・斤量・オッズは未確定のまま）";
}

export function getEntryDashboard() {
  const snap = getEntryStateSnapshot();
  const overlay = getEntryOverlay();
  return {
    version: ENTRY_ENGINE_VERSION,
    ...snap,
    overlayUpdatedAt: overlay?.updatedAt || snap.updatedAt,
    fingerprint: getLastEntryFingerprint(),
    statusLabels: ENTRY_STATUS_LABEL,
  };
}

export async function refreshEntriesOnly(options = {}) {
  return loadEntriesForAi({
    ...options,
    forceRefresh: true,
    emitUpdate: false,
    silent: true,
  });
}

export const HorseEntryManager = {
  loadForAi: loadEntriesForAi,
  filterForStage: filterEntriesForStage,
  toHorse: entryToHorseModel,
  dashboard: getEntryDashboard,
  refresh: refreshEntriesOnly,
  version: ENTRY_ENGINE_VERSION,
};
