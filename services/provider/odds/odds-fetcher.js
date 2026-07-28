/* ========================================
   OddsFetcher — Ver10.2
   ======================================== */

import {
  API_BASE_URL,
  REAL_ODDS_URL,
  REAL_ODDS_FETCH_TIMEOUT_MS,
} from "../../../js/config.js";

export const ODDS_FETCHER_VERSION = "10.2.0";

export async function fetchOddsRawData(options = {}) {
  const url =
    options.url || REAL_ODDS_URL || `${API_BASE_URL}odds/real-odds.json`;
  const timeoutMs =
    Number(options.timeoutMs) || REAL_ODDS_FETCH_TIMEOUT_MS || 12000;
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
        new Error(`Real Odds 取得失敗 (${res.status})`),
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
      version: ODDS_FETCHER_VERSION,
    };
  } catch (err) {
    const aborted = err?.name === "AbortError";
    throw Object.assign(
      new Error(
        aborted
          ? `Real Odds タイムアウト (${timeoutMs}ms)`
          : err?.message || "オッズ情報を取得できませんでした"
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

export const OddsFetcher = {
  fetch: fetchOddsRawData,
  version: ODDS_FETCHER_VERSION,
};
