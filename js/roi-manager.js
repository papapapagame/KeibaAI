/* ========================================
   PAPAPA IQ KEIBA - roi-manager.js
   Ver2.0.0 回収率管理（localStorage）
   予想保存 → 的中/不的中 → 回収率自動計算
   ======================================== */

import { ROI_STORAGE_KEY } from "./config.js";
import { formatDateTime } from "./utils.js";

export function loadRoiLedger() {
  try {
    const raw = localStorage.getItem(ROI_STORAGE_KEY);
    if (!raw) return emptyLedger();
    const data = JSON.parse(raw);
    return {
      ...emptyLedger(),
      ...data,
      entries: Array.isArray(data.entries) ? data.entries : [],
    };
  } catch {
    return emptyLedger();
  }
}

export function saveRoiLedger(ledger) {
  const next = {
    ...ledger,
    updatedAt: formatDateTime(),
    summary: summarize(ledger.entries || []),
  };
  try {
    localStorage.setItem(ROI_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** 予想馬券を保存 */
export function saveTicketPrediction({
  race,
  ticketType,
  strategy,
  amount,
  bets,
  comment,
}) {
  const ledger = loadRoiLedger();
  const entry = {
    id: `roi-${Date.now()}`,
    date: formatDateTime(),
    raceLabel: formatRaceLabel(race),
    race: race || {},
    ticketType: ticketType || "三連複",
    strategy: strategy || "バランス型",
    amount: Number(amount) || 0,
    bets: (bets || []).map((b) => ({
      mark: b.mark,
      combo: b.combo,
      stars: b.stars,
      confidence: b.confidence,
    })),
    comment: comment || [],
    status: "pending",
    hit: null,
    payout: 0,
    profit: -Number(amount) || 0,
    roi: 0,
  };
  ledger.entries = [entry, ...(ledger.entries || [])].slice(0, 300);
  return saveRoiLedger(ledger);
}

/** 結果反映（的中/不的中/払戻） */
export function settleTicket(entryId, { hit, payout }) {
  const ledger = loadRoiLedger();
  const entries = ledger.entries.map((entry) => {
    if (entry.id !== entryId) return entry;
    const pay = Math.max(0, Number(payout) || 0);
    const amount = Number(entry.amount) || 0;
    const isHit = hit == null ? pay > 0 : Boolean(hit);
    return {
      ...entry,
      status: isHit ? "hit" : "miss",
      hit: isHit,
      payout: pay,
      profit: pay - amount,
      roi: amount > 0 ? Math.round((pay / amount) * 1000) / 10 : 0,
      settledAt: formatDateTime(),
    };
  });
  return saveRoiLedger({ ...ledger, entries });
}

/** 簡易結果入力（最新pendingへ） */
export function settleLatestPending({ hit, payout }) {
  const ledger = loadRoiLedger();
  const pending = ledger.entries.find((e) => e.status === "pending");
  if (!pending) return { ledger, entry: null };
  const next = settleTicket(pending.id, { hit, payout });
  return {
    ledger: next,
    entry: next.entries.find((e) => e.id === pending.id) || null,
  };
}

export function getRoiSummary() {
  return loadRoiLedger().summary;
}

function emptyLedger() {
  return {
    version: "2.0.0",
    updatedAt: "",
    entries: [],
    summary: summarize([]),
  };
}

function summarize(entries) {
  const settled = entries.filter((e) => e.status === "hit" || e.status === "miss");
  const stake = settled.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const payout = settled.reduce((s, e) => s + (Number(e.payout) || 0), 0);
  const hits = settled.filter((e) => e.hit).length;
  return {
    races: settled.length,
    pending: entries.filter((e) => e.status === "pending").length,
    hits,
    hitRate: settled.length ? Math.round((hits / settled.length) * 1000) / 10 : 0,
    totalStake: stake,
    totalPayout: payout,
    balance: payout - stake,
    roi: stake > 0 ? Math.round((payout / stake) * 1000) / 10 : 100,
  };
}

function formatRaceLabel(race) {
  if (!race) return "-";
  const venue = race.venueLabel || race.venue || "";
  const num = race.number != null ? `${race.number}R` : "";
  return `${venue} ${num}`.trim() || "-";
}
