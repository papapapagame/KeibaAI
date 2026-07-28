/* ========================================
   PAPAPA IQ KEIBA - data-platform.js
   Ver7.0 Real Data Platform Dashboard UI
   ======================================== */

import {
  getDataDashboard,
  changeSourceMode,
  resetDataPlatformCache,
  getSourceMode,
} from "../services/data/index.js";
import { clearElement, createElement } from "./utils.js";

export async function initDataPlatformPage() {
  await render();

  document
    .getElementById("btn-data-refresh")
    ?.addEventListener("click", async () => {
      await render({ forceRefresh: true });
    });

  document
    .getElementById("btn-data-clear-cache")
    ?.addEventListener("click", async () => {
      resetDataPlatformCache();
      await render({ forceRefresh: true });
    });

  document.querySelectorAll("[data-dash-source-mode]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const mode = btn.getAttribute("data-dash-source-mode");
      changeSourceMode(mode);
      await render({ forceRefresh: true });
    });
  });
}

async function render(options = {}) {
  const dash = await getDataDashboard(options);
  const mode = dash.sourceMode || getSourceMode();

  setText("data-platform-ver", dash.version || "7.0.0");
  setText("data-current-provider", dash.currentProvider || "—");
  setText("data-selection-note", dash.selectionNote || "");
  setText("stat-data-cache", String(dash.cacheCount ?? "—"));
  setText("stat-data-updated", dash.updatedLabel || "—");
  setText(
    "stat-data-races",
    String(dash.dataCounts?.races ?? "—")
  );
  setText(
    "stat-data-horses",
    String(dash.dataCounts?.horses ?? "—")
  );
  setText("stat-data-errors", String(dash.errorCount ?? "—"));
  setText(
    "stat-data-online",
    String(dash.health?.online ?? "—")
  );

  const block = document.getElementById("data-block-banner");
  if (block) {
    const show = Boolean(dash.blocked);
    block.hidden = !show;
    block.classList.toggle("is-visible", show);
    setText(
      "data-block-message",
      dash.blockMessage || "Provider未接続"
    );
  }

  setText(
    "data-policy-note",
    dash.policy?.flow ||
      "Provider → Normalizer → Validator → Cache → Unified Model → AI"
  );

  document.querySelectorAll("[data-dash-source-mode]").forEach((btn) => {
    btn.classList.toggle(
      "is-active",
      btn.getAttribute("data-dash-source-mode") === mode
    );
  });
  setText("data-source-mode-label", mode);

  renderProviders(dash.providers || []);
  renderScheduler(dash.updatePlan || []);
  renderList(
    "data-cache-keys",
    (dash.cache?.keys || []).map((k) => k)
  );
}

function renderProviders(rows) {
  const body = document.getElementById("data-provider-body");
  if (!body) return;
  clearElement(body);
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "Provider なし";
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }
  for (const row of rows) {
    const tr = document.createElement("tr");
    const cells = [
      row.label || row.id,
      row.status || "—",
      row.lastUpdateLabel || "—",
      row.implemented ? "実装済" : "IFのみ",
      row.latencyMs != null ? `${row.latencyMs}ms` : "—",
      row.lastError || (row.errorCount ? `${row.errorCount}件` : "—"),
    ];
    for (const text of cells) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    }
    body.appendChild(tr);
  }
}

function renderScheduler(plan) {
  const list = document.getElementById("data-scheduler-list");
  if (!list) return;
  clearElement(list);
  for (const item of plan) {
    const li = createElement("li");
    li.textContent = `${item.kind}: ${item.due ? "更新可" : "待機"} · 間隔 ${Math.round((item.intervalMs || 0) / 1000)}s · 最終 ${item.lastRun || "—"}`;
    list.appendChild(li);
  }
}

function renderList(id, lines) {
  const list = document.getElementById(id);
  if (!list) return;
  clearElement(list);
  if (!lines.length) {
    const li = createElement("li");
    li.textContent = "キャッシュなし";
    list.appendChild(li);
    return;
  }
  for (const line of lines) {
    const li = createElement("li");
    li.textContent = line;
    list.appendChild(li);
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
