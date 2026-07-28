/* ========================================
   PAPAPA IQ KEIBA - update.js
   Ver7.2 Smart Update Engine Dashboard
   ======================================== */

import {
  getUpdateDashboard,
  setAutoUpdate,
  getAutoUpdate,
  tickSchedule,
  fireMockEvent,
  startSmartUpdateEngine,
  resetUpdateEngineData,
  AnalysisTrigger,
} from "../services/update/index.js";
import { clearElement, createElement } from "./utils.js";

export async function initUpdatePage() {
  // ダッシュボード単体でもエンジン状態を暖機
  startSmartUpdateEngine({
    contextProvider: () => ({
      isMeetingDay: true,
      raceStartAt: null,
      stage: 4,
      confidence: 82,
      completeness: 68,
      snapshot: AnalysisTrigger.buildSnapshot({
        race: { number: 7, trackCondition: "良", weather: "晴" },
        horses: [{ number: 1, jockey: "A", weight: 55, odds: 3.2, frame: 1 }],
        stage: 4,
      }),
    }),
    analysisHandler: async (job) => ({
      confidence: 82,
      completeness: 68,
      stage: 4,
      reason: job.reason,
    }),
  });

  render();

  document.getElementById("btn-update-refresh")?.addEventListener("click", () => {
    render();
  });

  document.getElementById("btn-update-tick")?.addEventListener("click", () => {
    tickSchedule(true);
    setTimeout(render, 50);
  });

  document.getElementById("btn-update-reset")?.addEventListener("click", () => {
    if (!confirm("更新履歴・状態をリセットしますか？")) return;
    resetUpdateEngineData();
    render();
  });

  document.getElementById("btn-auto-on")?.addEventListener("click", () => {
    setAutoUpdate(true);
    render();
  });
  document.getElementById("btn-auto-off")?.addEventListener("click", () => {
    setAutoUpdate(false);
    render();
  });

  const mockBox = document.getElementById("mock-event-buttons");
  if (mockBox) {
    clearElement(mockBox);
    const dash = getUpdateDashboard();
    (dash.mockEvents || []).forEach((ev) => {
      const btn = createElement("button", {
        type: "button",
        className: "v70-source-btn",
        text: ev.label,
      });
      btn.addEventListener("click", () => {
        fireMockEvent(ev.type);
        setTimeout(render, 50);
      });
      mockBox.appendChild(btn);
    });
  }
}

function render() {
  const dash = getUpdateDashboard();
  setText("upd-version", dash.version || "7.2.0");
  setText("upd-status", dash.statusLabel || dash.status || "—");
  setText("upd-auto", getAutoUpdate() ? "ON" : "OFF");
  setText("upd-next", dash.nextUpdateLabel || dash.schedule?.statusLabel || "—");
  setText("upd-phase", dash.schedule?.phaseLabel || "—");
  setText("upd-last-update", dash.lastUpdateLabel || "—");
  setText("upd-last-analysis", dash.lastAnalysisLabel || "—");
  setText("upd-reason", dash.lastReason || "—");
  setText("upd-priority", dash.lastPriority || "—");
  setText("upd-event", dash.lastEventType || "—");
  setText("upd-queue", String(dash.queueLength ?? 0));

  const targets = document.getElementById("upd-watch-targets");
  if (targets) {
    clearElement(targets);
    (dash.watchTargets || []).forEach((t) => {
      const li = createElement("li");
      li.textContent = t;
      targets.appendChild(li);
    });
  }

  const hist = document.getElementById("upd-history");
  if (hist) {
    clearElement(hist);
    const rows = dash.historyPreview || [];
    if (!rows.length) {
      const li = createElement("li");
      li.textContent = "履歴なし";
      hist.appendChild(li);
    } else {
      rows.forEach((r) => {
        const li = createElement("li");
        li.textContent = `${formatTs(r.timestamp)} · Stage${r.analysisStage ?? "—"} · Conf ${r.confidence ?? "—"}% · Comp ${r.dataCompleteness ?? "—"}% · ${r.reason || r.change}`;
        hist.appendChild(li);
      });
    }
  }

  document.querySelectorAll("[data-auto-state]").forEach((btn) => {
    const on = btn.getAttribute("data-auto-state") === "on";
    btn.classList.toggle("is-active", on === getAutoUpdate());
  });
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function formatTs(ts) {
  if (!ts) return "—";
  return String(ts).replace("T", " ").slice(0, 19);
}
