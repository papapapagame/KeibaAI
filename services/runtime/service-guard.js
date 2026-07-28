/* ========================================
   Service Guard — Ver9.0 RC
   統一エラーハンドリング（新機能ではなく品質基盤）
   ======================================== */

const state = {
  errors: [],
  warnings: [],
  recoveries: 0,
};

const MAX_LOG = 40;

export function recordError(scope, err, userMessage = "") {
  const entry = {
    level: "error",
    scope: String(scope || "unknown"),
    message: err?.message || String(err || "Unknown error"),
    userMessage:
      userMessage ||
      defaultUserMessage(scope, err),
    at: new Date().toISOString(),
  };
  state.errors.unshift(entry);
  if (state.errors.length > MAX_LOG) state.errors.length = MAX_LOG;
  return entry;
}

export function recordWarning(scope, message) {
  const entry = {
    level: "warning",
    scope: String(scope || "unknown"),
    message: String(message || ""),
    at: new Date().toISOString(),
  };
  state.warnings.unshift(entry);
  if (state.warnings.length > MAX_LOG) state.warnings.length = MAX_LOG;
  return entry;
}

export function recordRecovery(scope) {
  state.recoveries += 1;
  recordWarning(scope, "Recovered with fallback");
}

export function getErrorStats() {
  return {
    errorCount: state.errors.length,
    warningCount: state.warnings.length,
    recoveries: state.recoveries,
    lastError: state.errors[0] || null,
    lastWarning: state.warnings[0] || null,
    recentErrors: state.errors.slice(0, 8),
    recentWarnings: state.warnings.slice(0, 8),
  };
}

export function clearErrorStats() {
  state.errors = [];
  state.warnings = [];
  state.recoveries = 0;
}

/**
 * Async guard with timeout + fallback.
 */
export async function guardAsync(scope, fn, options = {}) {
  const timeoutMs = Number(options.timeoutMs) || 12000;
  const fallback =
    typeof options.fallback === "function"
      ? options.fallback
      : () => options.fallbackValue ?? null;
  const userMessage = options.userMessage || "";

  let timer = null;
  try {
    const result = await Promise.race([
      Promise.resolve().then(() => fn()),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Timeout after ${timeoutMs}ms`)),
          timeoutMs
        );
      }),
    ]);
    return { ok: true, data: result, recovered: false };
  } catch (err) {
    recordError(scope, err, userMessage);
    try {
      const data = await fallback(err);
      recordRecovery(scope);
      return { ok: false, data, recovered: true, error: err };
    } catch (err2) {
      recordError(`${scope}.fallback`, err2, userMessage);
      return { ok: false, data: null, recovered: false, error: err };
    }
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function guardSync(scope, fn, fallbackValue = null, userMessage = "") {
  try {
    return { ok: true, data: fn(), recovered: false };
  } catch (err) {
    recordError(scope, err, userMessage);
    recordRecovery(scope);
    return { ok: false, data: fallbackValue, recovered: true, error: err };
  }
}

function defaultUserMessage(scope, err) {
  const msg = String(err?.message || "");
  if (/timeout|タイムアウト/i.test(msg)) {
    return "通信がタイムアウトしました。しばらくしてから再試行してください。";
  }
  if (/network|fetch|Failed to fetch/i.test(msg)) {
    return "データ取得に失敗しました。接続を確認するか、設定から Mock / Real を切り替えてください。";
  }
  if (/valid/i.test(msg)) {
    return "データの検証に失敗しました。不正なデータは分析から除外されています。";
  }
  if (/provider/i.test(msg) || /未接続/.test(msg)) {
    return "Provider からデータを取得できませんでした。設定から Mock / Real を確認してください。";
  }
  if (/parse|parser|JSON/i.test(msg)) {
    return "データの解析に失敗しました。不正な応答は採用していません。";
  }
  if (/normaliz/i.test(msg)) {
    return "データの正規化に失敗しました。対象データは分析から除外されています。";
  }
  return `処理中に問題が発生しました（${scope}）。表示可能な範囲で継続します。`;
}

export const ServiceGuard = {
  async: guardAsync,
  sync: guardSync,
  recordError,
  recordWarning,
  recordRecovery,
  stats: getErrorStats,
  clear: clearErrorStats,
};
