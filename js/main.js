/* ========================================
   PAPAPA IQ KEIBA - main.js
   エントリーポイント（HTMLからはこのファイルのみ読込）
   ======================================== */

import { APP_NAME, DEBUG, VERSION } from "./config.js";
import { initCommonUI } from "./utils.js";
import {
  initRaceDetailPage,
  initRaceListPage,
  initTopPage,
} from "./race.js";
import { initAnalysisPage } from "./analysis.js";
import { initTicketPage } from "./ticket.js";
import { initBalancePage } from "./balance.js";
import { initSettingsPage } from "./settings.js";
import { initPerformancePage } from "./performance.js";
import { exposeLearningApi } from "./learning-engine.js";

document.addEventListener("DOMContentLoaded", async () => {
  if (DEBUG) {
    console.log(`${APP_NAME} Ver${VERSION}`);
  }

  try {
    exposeLearningApi();
  } catch (error) {
    console.error("[exposeLearningApi]", error);
  }

  initCommonUI();

  const reloadPageButton = document.getElementById("reload-page");
  if (reloadPageButton) {
    reloadPageButton.addEventListener("click", () => location.reload());
  }

  try {
    const goRaceListButton = document.getElementById("go-race-list");
    if (goRaceListButton) {
      await initTopPage(goRaceListButton);
    }

    if (document.getElementById("race-list")) {
      await initRaceListPage();
    }

    if (document.getElementById("entry-table-body")) {
      await initRaceDetailPage();
    }

    if (document.getElementById("radar-chart")) {
      await initAnalysisPage();
    }

    if (document.getElementById("ticket-bet-list")) {
      await initTicketPage();
    }

    if (document.getElementById("balance-history-body")) {
      await initBalancePage();
    }

    if (document.getElementById("save-settings")) {
      await initSettingsPage();
    }

    if (document.getElementById("learn-stats")) {
      await initPerformancePage();
    }
  } catch (error) {
    console.error(error);
    // 失敗時もロード画面を閉じる
    document.body.classList.remove("is-loading");
    document.getElementById("loading-screen")?.classList.add("is-hidden");
    if (DEBUG) {
      alert(
        "データの読み込みに失敗しました。\nローカル確認時は簡易サーバーを起動してください。\n例: python -m http.server 5500\n\n" +
          (error?.message || error)
      );
    }
  }
});
