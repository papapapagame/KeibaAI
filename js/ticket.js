/* ========================================
   PAPAPA IQ KEIBA - ticket.js
   Ver2.0.0 買い目3型 + 資金配分 + 予想保存
   ======================================== */

import { analyzeRace } from "./ai-engine.js";
import { DEFAULT_BET, MAX_TICKET, TICKET_BUDGETS, TICKET_STRATEGIES } from "./config.js";
import { saveTicketPrediction } from "./roi-manager.js";
import {
  appendLines,
  applyCardStagger,
  clearElement,
  createCard,
  createElement,
  formatStars,
  formatYen,
  getSearchParams,
  loadJson,
  navigateWithFade,
} from "./utils.js";

export async function initTicketPage() {
  const params = getSearchParams();
  const analysisParams = new URLSearchParams({
    date: params.get("date") || "",
    venue: params.get("venue") || "",
    venueLabel: params.get("venueLabel") || "",
    race: params.get("race") || "",
    name: params.get("name") || "",
    time: params.get("time") || "",
    grade: params.get("grade") || "",
  });

  document.getElementById("back-to-analysis").href =
    `analysis.html?${analysisParams.toString()}`;

  const raceNumber = Number(params.get("race") || 0);
  const [raceData, horsesData, settingsData] = await Promise.all([
    loadJson("race"),
    loadJson("horses"),
    loadJson("settings"),
  ]);

  const race =
    raceData.races.find((item) => item.number === raceNumber) ||
    raceData.races[0] ||
    null;

  const analysisResult = await analyzeRace({
    race,
    horses: horsesData.entries,
    settings: settingsData,
  });

  const ticketData = analysisResult.tickets;
  let selectedType = ticketData.defaultType || "三連複";
  let selectedStrategy = ticketData.defaultStrategy || "バランス型";
  const typeList = document.getElementById("ticket-type-list");
  const purchaseAmountInput = document.getElementById("purchase-amount");

  purchaseAmountInput.value =
    ticketData.defaultAmount != null ? ticketData.defaultAmount : DEFAULT_BET;

  const refresh = () => {
    renderTicket(
      ticketData,
      selectedType,
      selectedStrategy,
      Number(purchaseAmountInput.value) || 0
    );
  };

  // 戦略ボタンを既存リストへ追加（HTML変更なし）
  ensureStrategyButtons(typeList, selectedStrategy, (strategy) => {
    selectedStrategy = strategy;
    refresh();
  });

  typeList.querySelectorAll(".ticket-type-btn[data-type]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.type === selectedType);
  });

  typeList.addEventListener("click", (event) => {
    const button = event.target.closest(".ticket-type-btn[data-type]");
    if (!button) return;
    selectedType = button.dataset.type;
    typeList.querySelectorAll(".ticket-type-btn[data-type]").forEach((btn) => {
      btn.classList.toggle("is-active", btn === button);
    });
    refresh();
  });

  purchaseAmountInput.addEventListener("input", refresh);

  document.getElementById("save-ticket").addEventListener("click", () => {
    const data = resolveTicketData(ticketData, selectedType, selectedStrategy);
    if (!data) {
      alert("買い目データがありません");
      return;
    }
    const amount = Number(purchaseAmountInput.value) || DEFAULT_BET;
    saveTicketPrediction({
      race,
      ticketType: selectedType,
      strategy: selectedStrategy,
      amount,
      bets: data.bets,
      comment: data.comment,
    });
    alert(
      `買い目を保存しました\n${selectedStrategy} / ${selectedType} / ${formatYen(amount)}円\n収支管理で回収率を確認できます`
    );
  });

  document.getElementById("go-ledger").addEventListener("click", () => {
    navigateWithFade(`balance.html?${analysisParams.toString()}`);
  });

  refresh();
}

function ensureStrategyButtons(typeList, selectedStrategy, onSelect) {
  if (!typeList || typeList.querySelector("[data-strategy]")) return;

  TICKET_STRATEGIES.forEach((strategy) => {
    const btn = createElement("button", {
      type: "button",
      className: "ticket-type-btn",
      text: strategy,
      dataset: { strategy },
      onClick: () => {
        typeList.querySelectorAll("[data-strategy]").forEach((el) => {
          el.classList.toggle("is-active", el.dataset.strategy === strategy);
        });
        onSelect(strategy);
      },
    });
    if (strategy === selectedStrategy) btn.classList.add("is-active");
    typeList.appendChild(btn);
  });
}

function resolveTicketData(ticketData, selectedType, selectedStrategy) {
  const typeNode = ticketData.types?.[selectedType];
  if (!typeNode) return null;
  if (typeNode[selectedStrategy]?.bets) return typeNode[selectedStrategy];
  return typeNode;
}

/** 買い目画面描画 */
export function renderTicket(ticketData, selectedType, selectedStrategy, amount) {
  const data = resolveTicketData(ticketData, selectedType, selectedStrategy);
  if (!data) return;

  const betList = document.getElementById("ticket-bet-list");
  clearElement(betList);

  data.bets.slice(0, MAX_TICKET).forEach((bet) => {
    const mark = createElement("span", {
      className: "ticket-bet-card__mark",
      text: bet.mark,
    });
    const combo = createElement("span", {
      className: "ticket-bet-card__combo",
      text: bet.combo,
    });
    const main = createElement("div", {
      className: "ticket-bet-card__main",
      children: [mark, combo],
    });

    const stars = createElement("span", {
      className: "entry-stars",
      text: `期待値${formatStars(bet.stars)}`,
    });
    const confidence = createElement("span", {
      className: "ticket-bet-card__confidence",
      text: `AI信頼度${bet.confidence}%`,
    });
    const meta = createElement("div", {
      className: "ticket-bet-card__meta",
      children: [stars, confidence],
    });

    betList.appendChild(createCard("ticket-bet-card", [main, meta]));
  });

  const budget = nearestBudget(amount);
  const plan =
    ticketData.fundPlans?.[budget]?.[selectedStrategy] ||
    ticketData.fundPlans?.[budget]?.バランス型;
  document.getElementById("fund-allocation").textContent = plan?.text
    ? `${selectedStrategy}（${formatYen(budget)}円）: ${plan.text}`
    : data.allocation || "配分計算中";

  appendLines(document.getElementById("ticket-ai-comment"), [
    `戦略: ${selectedStrategy}`,
    "",
    ...(data.comment || []),
    "",
    "【資金配分プラン】",
    ...TICKET_BUDGETS.map((b) => {
      const p = ticketData.fundPlans?.[b]?.[selectedStrategy];
      return p ? `${formatYen(b)}円 → ${p.text}` : "";
    }).filter(Boolean),
  ]);

  const payout = Math.round(amount * (data.payoutRate || 1));
  const profit = payout - amount;
  const roi = amount > 0 ? Math.round((payout / amount) * 100) : 0;

  document.getElementById("fund-total").textContent = `${formatYen(amount)}円`;
  document.getElementById("fund-payout").textContent = `${formatYen(payout)}円`;
  document.getElementById("fund-profit").textContent =
    `${profit >= 0 ? "+" : ""}${formatYen(profit)}円`;
  document.getElementById("fund-roi").textContent = `${roi}%`;

  applyCardStagger();
}

function nearestBudget(amount) {
  let best = TICKET_BUDGETS[0];
  let bestDiff = Math.abs(amount - best);
  TICKET_BUDGETS.forEach((b) => {
    const d = Math.abs(amount - b);
    if (d < bestDiff) {
      best = b;
      bestDiff = d;
    }
  });
  return best;
}
