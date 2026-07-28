/* ========================================
   RaceCalendarFetcher — Ver10.0
   Real Race Calendar の生データ取得
   ======================================== */

import {
  API_BASE_URL,
  REAL_RACE_CALENDAR_URL,
  REAL_RACE_FETCH_TIMEOUT_MS,
} from "../../../js/config.js";

export const RACE_CALENDAR_FETCHER_VERSION = "10.0.0";

/**
 * Real Calendar を取得する。
 * 既定: data/calendar/real-calendar.json（GitHub Pages 対応）
 * REAL_RACE_CALENDAR_URL で外部 API へ差し替え可能。
 */
export async function fetchRaceCalendarRaw(options = {}) {
  const url =
    options.url ||
    REAL_RACE_CALENDAR_URL ||
    `${API_BASE_URL}calendar/real-calendar.json`;
  const timeoutMs =
    Number(options.timeoutMs) || REAL_RACE_FETCH_TIMEOUT_MS || 12000;
  const started = performance.now();

  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  let timer = null;
  if (controller) {
    timer = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    const res = await fetch(url, {
      cache: options.force ? "no-store" : "default",
      signal: controller?.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw Object.assign(
        new Error(`Real Race Calendar 取得失敗 (${res.status})`),
        { code: "FETCH_HTTP", status: res.status, url }
      );
    }
    const raw = await res.json();
    return {
      ok: true,
      raw,
      url,
      fetchedAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - started),
      version: RACE_CALENDAR_FETCHER_VERSION,
    };
  } catch (err) {
    const aborted = err?.name === "AbortError";
    throw Object.assign(
      new Error(
        aborted
          ? `Real Race Calendar タイムアウト (${timeoutMs}ms)`
          : err?.message || "Real Race Calendar 取得失敗"
      ),
      {
        code: aborted ? "FETCH_TIMEOUT" : err?.code || "FETCH_ERROR",
        cause: err,
        url,
      }
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const RaceCalendarFetcher = {
  fetch: fetchRaceCalendarRaw,
  version: RACE_CALENDAR_FETCHER_VERSION,
};
