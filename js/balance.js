/* ========================================
   PAPAPA IQ KEIBA - balance.js
   Ver2.0.0 回収率管理 + 学習指標
   ======================================== */

import {
  appendLines,
  applyCardStagger,
  clearElement,
  createAiGrade,
  createElement,
  createTableRow,
  formatYen,
  loadJson,
  navigateWithFade,
  renderTableBody,
} from "./utils.js";
import {
  exposeLearningApi,
  getLearningMetrics,
  loadLearningState,
  promptAndLearn,
} from "./learning-engine.js";
import {
  getRoiSummary,
  loadRoiLedger,
  settleLatestPending,
} from "./roi-manager.js";

export async function initBalancePage() {
  exposeLearningApi();
  const [balanceData, learningState] = await Promise.all([
    loadJson("balance"),
    loadLearningState(),
  ]);
  const roiLedger = loadRoiLedger();
  renderBalance(balanceData, learningState, roiLedger);

  document.getElementById("export-csv").addEventListener("click", () => {
    const payoutRaw = window.prompt(
      "最新の保存買い目の払戻金額を入力（不的中は0）\n的中/不的中と回収率を自動更新します",
      "0"
    );
    if (payoutRaw == null) return;
    const payout = Math.max(0, Number(payoutRaw) || 0);
    const { ledger, entry } = settleLatestPending({
      hit: payout > 0,
      payout,
    });
    if (!entry) {
      alert("未精算の保存買い目がありません。買い目画面で「保存する」を実行してください。");
      return;
    }
    renderBalance(balanceData, learningState, ledger);
    alert(
      `精算しました\n${entry.hit ? "的中" : "不的中"} / 払戻 ${formatYen(entry.payout)}円 / 回収率 ${entry.roi}%`
    );
  });

  document.getElementById("go-settings").addEventListener("click", () => {
    navigateWithFade("settings.html");
  });
}

/** 収支管理画面描画 */
export function renderBalance(balanceData, learningState = null, roiLedger = null) {
  const summary = balanceData.summary;
  const metrics = learningState?.metrics || null;
  const roi = roiLedger?.summary || getRoiSummary();

  // ROI実績があれば優先表示、なければ学習指標
  if (roi && roi.races > 0) {
    bindRoiSummary(roi);
  } else {
    document.getElementById("summary-purchase").textContent =
      `${formatYen(summary.totalPurchase)}円`;
    document.getElementById("summary-payout").textContent =
      `${formatYen(summary.totalPayout)}円`;
    document.getElementById("summary-balance").textContent =
      `＋${formatYen(summary.balance)}円`;
    document.getElementById("summary-roi").textContent = `${summary.roi}%`;
    bindLearningSummary(metrics);
  }

  const gradeEl = document.getElementById("summary-grade");
  gradeEl.className = `ai-grade ai-grade--${summary.grade.toLowerCase()}`;
  gradeEl.textContent = `AI ${summary.grade}`;

  const history = mergeHistory(balanceData, roiLedger);
  const rows = history.map((item) => {
    const profit = item.payout - item.amount;
    const profitClass = profit >= 0 ? "history-plus" : "history-minus";
    const profitText = `${profit >= 0 ? "+" : ""}${formatYen(profit)}円`;

    const tr = createTableRow([
      item.date,
      item.race,
      item.type,
      `${formatYen(item.amount)}円`,
      `${formatYen(item.payout)}円`,
      profitText,
      "",
    ]);

    tr.children[1].className = "entry-horse";
    tr.children[5].className = profitClass;

    clearElement(tr.children[6]);
    tr.children[6].appendChild(createAiGrade(item.grade || (item.hit ? "A" : "C")));
    return tr;
  });

  renderTableBody(document.getElementById("balance-history-body"), rows);

  const commentLines = [
    ...(balanceData.aiComment || []),
    "",
    ...buildRoiComment(roi),
    "",
    ...buildLearningComment(metrics),
  ];
  appendLines(document.getElementById("balance-ai-comment"), commentLines);

  const improveList = document.getElementById("improve-list");
  clearElement(improveList);
  bindLearningImproveTitle();
  buildRoiMetricItems(roi).forEach((item) => {
    improveList.appendChild(createElement("li", { text: item }));
  });
  buildLearningMetricItems(metrics).forEach((item) => {
    improveList.appendChild(createElement("li", { text: item }));
  });
  (balanceData.improvements || []).forEach((item) => {
    improveList.appendChild(createElement("li", { text: item }));
  });

  applyCardStagger();
  drawBalanceChart(document.getElementById("balance-chart"), balanceData.monthly);
}

function bindRoiSummary(roi) {
  const items = document.querySelectorAll(".balance-summary__item");
  const values = [
    { label: "投資額", value: `${formatYen(roi.totalStake)}円` },
    { label: "払戻", value: `${formatYen(roi.totalPayout)}円` },
    {
      label: "収支",
      value: `${roi.balance >= 0 ? "＋" : ""}${formatYen(roi.balance)}円`,
    },
    { label: "回収率", value: `${roi.roi}%` },
  ];
  values.forEach((item, index) => {
    const node = items[index];
    if (!node) return;
    const label = node.querySelector(".balance-summary__label");
    const value = node.querySelector(".balance-summary__value");
    if (label) label.textContent = item.label;
    if (value) {
      value.textContent = item.value;
      value.classList.toggle("balance-summary__value--plus", item.label === "収支" && roi.balance >= 0);
    }
  });
}

function bindLearningSummary(metrics) {
  if (!metrics) return;

  const items = document.querySelectorAll(".balance-summary__item");
  const values = [
    { label: "AI回収率", value: `${Number(metrics.aiRoi).toFixed(1)}%` },
    { label: "AI的中率", value: `${Number(metrics.aiHitRate).toFixed(1)}%` },
    {
      label: "指数平均誤差",
      value: String(Number(metrics.indexAvgError).toFixed(1)),
    },
    { label: "期待値平均", value: String(Math.round(metrics.evAverage)) },
  ];

  values.forEach((item, index) => {
    const node = items[index];
    if (!node) return;
    const label = node.querySelector(".balance-summary__label");
    const value = node.querySelector(".balance-summary__value");
    if (label) label.textContent = item.label;
    if (value) {
      value.textContent = item.value;
      value.classList.remove("balance-summary__value--plus");
      if (item.label === "AI回収率" && Number(metrics.aiRoi) >= 100) {
        value.classList.add("balance-summary__value--plus");
      }
    }
  });
}

function bindLearningImproveTitle() {
  const improveCard = document.querySelector(".improve-card .section-title");
  if (improveCard) improveCard.textContent = "回収率 / AI学習指標";
}

function buildRoiMetricItems(roi) {
  if (!roi) return [];
  return [
    `馬券回収率: ${roi.roi}%`,
    `的中率: ${roi.hitRate}%（${roi.hits}/${roi.races}）`,
    `未精算: ${roi.pending}件`,
    `投資 ${formatYen(roi.totalStake)}円 / 払戻 ${formatYen(roi.totalPayout)}円`,
  ];
}

function buildLearningMetricItems(metrics) {
  if (!metrics) return ["学習データがありません"];
  return [
    `AI学習回収率: ${Number(metrics.aiRoi).toFixed(1)}%`,
    `AI学習的中率: ${Number(metrics.aiHitRate).toFixed(1)}%`,
    `指数平均誤差: ${Number(metrics.indexAvgError).toFixed(1)}`,
    `期待値平均: ${Math.round(metrics.evAverage)}`,
  ];
}

function buildRoiComment(roi) {
  if (!roi || !roi.races) {
    return ["保存済み馬券の精算がまだありません。買い目画面で保存してください。"];
  }
  return [
    `回収率管理: 回収率 ${roi.roi}% / 的中率 ${roi.hitRate}%`,
    roi.roi >= 100
      ? "現在の買い目は回収率ベースでプラス圏です。"
      : "回収率改善のため期待値・穴候補の配分を見直してください。",
  ];
}

function buildLearningComment(metrics) {
  if (!metrics) return [];
  return [
    `学習反映: AI回収率 ${Number(metrics.aiRoi).toFixed(1)}% / 的中率 ${Number(metrics.aiHitRate).toFixed(1)}%`,
  ];
}

function mergeHistory(balanceData, roiLedger) {
  const roiEntries = (roiLedger?.entries || []).map((entry) => ({
    date: entry.date,
    race: entry.raceLabel || "-",
    type: `${entry.ticketType}/${entry.strategy}`,
    amount: entry.amount,
    payout: entry.status === "pending" ? 0 : entry.payout,
    grade: entry.status === "pending" ? "B" : entry.hit ? "A" : "C",
    hit: entry.hit,
  }));

  if (roiEntries.length) return roiEntries;

  if (Array.isArray(balanceData.history) && balanceData.history.length) {
    return balanceData.history;
  }

  const purchases = balanceData.purchases || [];
  const payouts = balanceData.payouts || [];

  return purchases.map((purchase, index) => ({
    date: purchase.date,
    race: purchase.race,
    type: purchase.type,
    amount: purchase.amount,
    payout: payouts[index]?.payout ?? 0,
    grade: purchase.grade,
  }));
}

function drawBalanceChart(canvas, monthlyData) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const parentWidth = canvas.parentElement.clientWidth || 800;
  const width = Math.max(320, parentWidth - 24);
  const height = 280;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const padding = { top: 24, right: 16, bottom: 42, left: 16 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxAbs = Math.max(...monthlyData.map((item) => Math.abs(item.value)), 1);
  const zeroY = padding.top + chartHeight / 2;
  const barGap = 10;
  const barWidth =
    (chartWidth - barGap * (monthlyData.length - 1)) / monthlyData.length;

  ctx.strokeStyle = "rgba(201, 162, 39, 0.25)";
  ctx.beginPath();
  ctx.moveTo(padding.left, zeroY);
  ctx.lineTo(width - padding.right, zeroY);
  ctx.stroke();

  monthlyData.forEach((item, index) => {
    const x = padding.left + index * (barWidth + barGap);
    const barHeight = (Math.abs(item.value) / maxAbs) * (chartHeight / 2 - 8);
    const y = item.value >= 0 ? zeroY - barHeight : zeroY;

    const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
    if (item.value >= 0) {
      gradient.addColorStop(0, "#e8d48b");
      gradient.addColorStop(1, "#a88720");
    } else {
      gradient.addColorStop(0, "#c62828");
      gradient.addColorStop(1, "#7a1a1a");
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#a39a86";
    ctx.font = "700 12px 'Noto Sans JP', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(item.label, x + barWidth / 2, height - 16);
  });
}

export { getLearningMetrics, promptAndLearn };
