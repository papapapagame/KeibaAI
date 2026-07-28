/* ========================================
   PAPAPA IQ KEIBA - settings.js
   Ver1.0.0 学習入力（HTML追加なし / prompt）
   ======================================== */

import { APP_NAME, VERSION, RELEASE_CHANNEL, BUILD_DATE, BUILD_NUMBER } from "./config.js";
import { formatDateTime, loadJson } from "./utils.js";
import {
  clearLearningOverlay,
  exposeLearningApi,
  promptAndLearn,
} from "./learning-engine.js";

export async function initSettingsPage() {
  exposeLearningApi();
  const settingsData = await loadJson("settings");
  renderSettings(settingsData);
  bindSettingsEvents();
}

/** 設定画面描画 */
export function renderSettings(settingsData) {
  const ai = settingsData.ai || {};
  const theme = settingsData.theme || {};
  const notifications = settingsData.notifications || {};

  const precision = ai.precision || settingsData.aiPrecision || "standard";
  document.querySelectorAll('input[name="ai-precision"]').forEach((input) => {
    input.checked = input.value === precision;
  });

  setCheckbox("setting-ev", ai.evFocus ?? settingsData.toggles?.evFocus);
  setCheckbox(
    "setting-popularity",
    ai.popularityOrder ?? settingsData.toggles?.popularityOrder
  );
  setCheckbox(
    "setting-upset",
    ai.upsetHighlight ?? settingsData.toggles?.upsetHighlight
  );
  setCheckbox(
    "setting-danger",
    ai.dangerDisplay ?? settingsData.toggles?.dangerDisplay
  );
  setCheckbox(
    "setting-dark",
    theme.mode === "dark" || settingsData.toggles?.darkTheme !== false
  );

  setCheckbox("notify-ai", notifications.aiComplete);
  setCheckbox("notify-roi", notifications.roiUpdate);
  setCheckbox("notify-grade", notifications.gradeRace);

  document.getElementById("last-updated").textContent =
    settingsData.lastUpdated || "";
  document.getElementById("settings-app-name").textContent =
    settingsData.appName || APP_NAME;
  document.getElementById("settings-version").textContent =
    settingsData.displayVersion ||
    `Ver${VERSION} ${RELEASE_CHANNEL} (${BUILD_NUMBER} / ${BUILD_DATE})`;
}

function bindSettingsEvents() {
  const darkTheme = document.getElementById("setting-dark");
  const darkThemeToggle = document.getElementById("dark-theme-toggle");

  darkThemeToggle.addEventListener("click", (event) => {
    event.preventDefault();
    darkTheme.checked = true;
    alert("ダークテーマはON固定です（ダミー）");
  });

  // 既存「更新する」ボタンでレース結果学習を実行（UI追加なし）
  document.getElementById("update-data").addEventListener("click", async () => {
    const learned = await promptAndLearn({
      raceHint: "東京,芝,1600,良",
      resultHint: "1:1:1:280,5:2:4:0,2:3:3:0",
      stake: 1000,
    });
    if (learned) {
      document.getElementById("last-updated").textContent = formatDateTime();
    }
  });

  document.getElementById("clear-cache").addEventListener("click", () => {
    clearLearningOverlay();
    alert("学習キャッシュ（localStorage）を削除しました。history.json の初期学習は残ります。");
  });

  document.getElementById("show-terms").addEventListener("click", () => {
    alert(
      `利用規約（ダミー）\n\n${APP_NAME}は個人利用を想定した競馬AI分析システムです。`
    );
  });

  document.getElementById("save-settings").addEventListener("click", () => {
    alert("設定を保存しました（ダミー）");
  });
}

function setCheckbox(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.checked = Boolean(value);
}
