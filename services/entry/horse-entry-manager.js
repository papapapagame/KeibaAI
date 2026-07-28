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
import {
  ENTRY_STATUS,
  ENTRY_STATUS_LABEL,
} from "./entry-status.js";
import { ENTRY_ENGINE_VERSION } from "./entry-data-connector.js";
import { toLegacyHorse } from "../models/unified.js";

/**
 * 登録馬を取得し、Stage 用に整形して返す
 */
export async function loadEntriesForAi(options = {}) {
  const connected = await connectEntryData(options);
  if (!connected.ok) {
    setEntryState([], { syncStatus: "error", updatedAt: new Date().toISOString() });
    return {
      ...connected,
      stats: computeEntryStats([]),
      sync: { status: "error" },
      forStage: [],
      legacyHorses: [],
    };
  }

  const prevFp = getLastEntryFingerprint();
  const fp = fingerprintEntries(connected.entries);
  const changed = options.forceRefresh ? true : fp !== prevFp;

  const sync = syncEntries(connected.entries, {
    emitUpdate: options.emitUpdate !== false && changed && prevFp != null,
    force: options.forceRefresh,
    meta: connected.meta,
  });
  setLastEntryFingerprint(fp);
  setEntryState(connected.entries, {
    updatedAt: connected.fetchedAt,
    syncStatus: sync.changed ? "synced" : "skipped",
  });

  const stage = Number(options.stage ?? 0) || 0;
  const forStage = filterEntriesForStage(connected.entries, stage);
  const legacyHorses = forStage.map((e) =>
    toLegacyHorse(entryToHorseModel(e, stage))
  );

  const stats = computeEntryStats(connected.entries);

  return {
    ok: true,
    blocked: false,
    message: changed ? "Entry loaded" : "Entry unchanged",
    providerId: connected.providerId,
    version: ENTRY_ENGINE_VERSION,
    changed,
    fingerprint: fp,
    entries: connected.entries,
    unified: connected.unified,
    forStage,
    legacyHorses,
    validation: connected.validation,
    stats,
    sync: {
      status: sync.changed ? "synced" : "skipped",
      changes: sync.changes?.length || 0,
    },
    count: connected.count,
    fetchedAt: connected.fetchedAt,
    stage,
    stageNote: stageNote(stage),
  };
}

/**
 * Stage1: 登録馬のみ
 * Stage2: 出走予定馬
 * Stage3+: 取消・除外・回避を除き確定待ち（未確定フィールドは渡さない）
 */
export function filterEntriesForStage(entries = [], stage = 0) {
  const s = Number(stage) || 0;
  const list = entries || [];

  if (s < 1) return [];

  if (s === 1) {
    return list.filter((e) => e.entryStatus === ENTRY_STATUS.REGISTERED);
  }

  if (s === 2) {
    return list.filter((e) => e.entryStatus === ENTRY_STATUS.PLANNED);
  }

  // Stage3+: 取消・除外・回避以外（出走予定＋出走確定）
  return list.filter(
    (e) =>
      e.entryStatus === ENTRY_STATUS.PLANNED ||
      e.entryStatus === ENTRY_STATUS.CONFIRMED
  );
}

/**
 * Stage3未満: 枠・騎手・斤量・オッズを確定情報として渡さない
 */
export function entryToHorseModel(entry, stage = 0) {
  const s = Number(stage) || 0;
  const base = {
    horseId: entry.horseId,
    number: entry.number,
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
    entryStatusLabel: entry.entryStatusLabel || ENTRY_STATUS_LABEL[entry.entryStatus],
    affiliation: entry.affiliation,
    careerRecord: entry.careerRecord,
    courseRecord: entry.courseRecord,
    stakesRecord: entry.stakesRecord,
    earnings: entry.earnings,
    scratched: entry.entryStatus === ENTRY_STATUS.SCRATCHED,
    excluded: entry.entryStatus === ENTRY_STATUS.EXCLUDED,
  };

  // Ver7.6: 枠・騎手・斤量・オッズは未確定（Stage に関わらず Entry Engine では確定扱いにしない）
  // Stage3未満では sanitize でも落とすが、ここでも明示
  if (s < 3) {
    return {
      ...base,
      frame: 0,
      jockey: "未定",
      weight: 55,
      odds: 99.9,
      popularity: 99,
      _frameUnconfirmed: true,
      _jockeyUnconfirmed: true,
      _weightUnconfirmed: true,
      _oddsUnconfirmed: true,
      _entryProvisional: true,
    };
  }

  // Stage3+ でも Entry Engine 自体は未確定フィールドを確定として渡さない
  // （枠順等は別レイヤの確定後にのみ利用）
  return {
    ...base,
    frame: 0,
    jockey: "未定",
    weight: 55,
    odds: 99.9,
    popularity: 99,
    _frameUnconfirmed: true,
    _jockeyUnconfirmed: true,
    _weightUnconfirmed: true,
    _oddsUnconfirmed: true,
    _entryAwaitingConfirm: true,
  };
}

function stageNote(stage) {
  const s = Number(stage) || 0;
  if (s < 1) return "開催情報のみ（登録馬なし）";
  if (s === 1) return "登録馬のみ（暫定・未確定情報は反映しない）";
  if (s === 2) return "出走予定馬（暫定・枠/騎手/斤量/オッズは未確定）";
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
