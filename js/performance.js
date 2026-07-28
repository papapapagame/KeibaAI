/* ========================================
   PAPAPA IQ KEIBA - performance.js
   Ver5.5 Learning AI Engine UI
   ======================================== */

import {
  getLearningDashboard,
  resetAnalyzerWeights,
  resetLearningAiData,
  updateAnalyzerWeights,
} from "../services/learning/index.js";
import { clearElement, createElement } from "./utils.js";

export async function initPerformancePage() {
  renderDashboard(getLearningDashboard({ ensureDemo: true }));

  document.getElementById("btn-reset-weights")?.addEventListener("click", () => {
    resetAnalyzerWeights();
    renderDashboard(getLearningDashboard({ ensureDemo: false }));
  });

  document
    .getElementById("btn-apply-proposed")
    ?.addEventListener("click", () => {
      const dash = getLearningDashboard({ ensureDemo: false });
      updateAnalyzerWeights(dash.weightProposal?.proposed || dash.weights);
      renderDashboard(getLearningDashboard({ ensureDemo: false }));
    });

  document
    .getElementById("btn-reset-learning")
    ?.addEventListener("click", () => {
      if (!confirm("学習データ（Learning AI DB）をリセットしますか？")) return;
      try {
        localStorage.removeItem("papapa_iq_learning_demo_v55");
      } catch {
        /* ignore */
      }
      renderDashboard(resetLearningAiData());
    });
}

function renderDashboard(dash) {
  const meta = dash.dbMeta || {};
  const perf = dash.performance || {};

  setText("learn-engine-ver", meta.engineVersion || "—");
  setText("learn-learning-ver", meta.learningVersion || "—");
  setText(
    "learn-policy-note",
    dash.policy?.autoRewriteForbidden
      ? "予想ロジックの自動書換は禁止。蓄積・分析・重み提案のみ（Ver6.0で安全反映予定）。"
      : ""
  );

  setText("stat-races", String(perf.totalRaces ?? "—"));
  setText("stat-hit", formatPct(perf.hitRate));
  setText("stat-recovery", formatPct(perf.recoveryRate));
  setText("stat-roi", formatPct(perf.roi));
  setText(
    "stat-pop",
    perf.avgPopularity != null ? String(perf.avgPopularity) : "—"
  );
  setText("stat-ev", String(perf.avgExpectedValue ?? "—"));
  setText("stat-iq", String(perf.avgIqScore ?? "—"));

  renderAnalyzerRank(dash.analyzerStats || []);
  renderList(
    "recent-learn",
    (dash.recent || []).map(
      (r) =>
        `${r.label} · ${r.hit ? "的中" : "外れ"} · ROI ${r.roi}% · IQ ${r.iq ?? "—"}`
    )
  );
  renderList("improve-points", dash.improvements || []);
  renderBars("hit-series", (perf.hitSeries || []).map((x) => x.hitRate), "%");
  renderBars("roi-series", (perf.roiSeries || []).map((x) => x.roi), "%");
  renderBars(
    "acc-series",
    (dash.accuracySeries || []).map((x) => x.accuracy),
    "%"
  );

  renderExplain(dash);
  renderWeights(dash);
}

function renderAnalyzerRank(rows) {
  const box = document.getElementById("analyzer-rank");
  if (!box) return;
  clearElement(box);
  if (!rows.length) {
    box.textContent = "データなし";
    return;
  }
  rows.forEach((row, i) => {
    const card = createElement("article", {
      className: "glass-card v55-rank-card",
    });
    const title = createElement("p", { className: "v55-rank-card__name" });
    title.textContent = `${i + 1}. ${row.name}`;
    const acc = createElement("p", { className: "v55-rank-card__acc" });
    acc.textContent = `${row.accuracy}%`;
    const meta = createElement("p", { className: "v55-rank-card__meta" });
    meta.textContent = `順位誤差 ${row.avgRankError ?? "—"} / EV ${row.expectedValue} / 信頼度 ${row.confidence} / ROI ${row.roi}%`;
    const bar = createElement("div", { className: "v54-gauge__track" });
    const fill = createElement("span", { className: "v54-gauge__fill" });
    fill.style.width = `${Math.max(0, Math.min(100, row.accuracy))}%`;
    bar.appendChild(fill);
    card.append(title, acc, meta, bar);
    box.appendChild(card);
  });
}

function renderExplain(dash) {
  const list = document.getElementById("explain-learning-list");
  if (!list) return;
  clearElement(list);
  const recent = (dash.recent || []).slice(0, 1);
  const records = getLearningDashboard({ ensureDemo: false });
  // pull explain from history messages + latest closed record via improvements already shown
  const lines = [];
  for (const h of (dash.history || []).filter((x) => x.type === "learn").slice(0, 5)) {
    lines.push(h.message);
  }
  if (!lines.length) {
    lines.push("まだ学習説明がありません。結果登録後に表示されます。");
  }
  for (const text of lines) {
    const li = createElement("li");
    li.textContent = `・${text}`;
    list.appendChild(li);
  }
  void recent;
  void records;
}

function renderWeights(dash) {
  const box = document.getElementById("weight-list");
  const sug = document.getElementById("weight-suggestions");
  if (box) {
    clearElement(box);
    const weights = dash.weights || {};
    Object.keys(weights).forEach((key) => {
      const row = createElement("div", { className: "v55-weight-row" });
      const label = createElement("label");
      label.textContent = key;
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = "1";
      input.step = "0.01";
      input.value = String(weights[key]);
      input.dataset.key = key;
      input.disabled = key === "LearningEngine";
      input.addEventListener("change", () => {
        const next = { ...getLearningDashboard({ ensureDemo: false }).weights };
        document.querySelectorAll("#weight-list input[data-key]").forEach((el) => {
          next[el.dataset.key] = Number(el.value);
        });
        updateAnalyzerWeights(next);
        renderDashboard(getLearningDashboard({ ensureDemo: false }));
      });
      row.append(label, input);
      box.appendChild(row);
    });
  }
  if (sug) {
    clearElement(sug);
    const items = dash.weightProposal?.suggestions || [];
    if (!items.length) {
      const li = createElement("li");
      li.textContent = "現時点で大きな重み変更提案はありません。";
      sug.appendChild(li);
    } else {
      for (const s of items) {
        const li = createElement("li");
        li.textContent = `${s.analyzer}: ${s.from} → ${s.to}（${s.reason}）`;
        sug.appendChild(li);
      }
    }
  }
}

function renderList(id, items) {
  const box = document.getElementById(id);
  if (!box) return;
  clearElement(box);
  if (!items.length) {
    const li = createElement("li");
    li.textContent = "—";
    box.appendChild(li);
    return;
  }
  for (const text of items) {
    const li = createElement("li");
    li.textContent = text;
    box.appendChild(li);
  }
}

function renderBars(id, values, suffix = "") {
  const box = document.getElementById(id);
  if (!box) return;
  clearElement(box);
  const list = Array.isArray(values) ? values.slice(-8) : [];
  if (!list.length) {
    box.textContent = "—";
    return;
  }
  for (const v of list) {
    const row = createElement("div", { className: "v55-bar-row" });
    const track = createElement("div", { className: "v54-gauge__track" });
    const fill = createElement("span", { className: "v54-gauge__fill" });
    const n = Number(v) || 0;
    fill.style.width = `${Math.max(0, Math.min(100, n))}%`;
    track.appendChild(fill);
    const label = createElement("span", { className: "v55-bar-row__val" });
    label.textContent = `${n}${suffix}`;
    row.append(track, label);
    box.appendChild(row);
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function formatPct(v) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return `${v}%`;
}
