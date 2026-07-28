/* ========================================
   PAPAPA IQ KEIBA - ticket.js
   Ver6.0 Betting Intelligence AI（表示層）
   既存 ai-engine / thinking-engine は変更しない
   ======================================== */

import { analyzeRace } from "./ai-engine.js";
import { DEFAULT_BET, DEBUG, DEBUG_MODE } from "./config.js";
import { saveTicketPrediction } from "./roi-manager.js";
import {
  runBettingEngine,
  allocateBankroll,
  distributeToTickets,
  saveBettingHistory,
  saveBettingFavorite,
  ticketsToCsv,
  ticketsToJson,
  downloadText,
  copyText,
} from "../services/betting/index.js";
import { runIntelligenceEngine } from "../services/ai/index.js";
import { runMarketEngine } from "../services/market/index.js";
import { getLearningDashboard } from "../services/learning/index.js";
import {
  buildIntelligencePacket,
  initIntelligenceManager,
} from "../services/intelligence/index.js";
import { loadRaceForAi } from "../services/race/index.js";
import {
  clearElement,
  createElement,
  formatYen,
  getSearchParams,
  navigateWithFade,
} from "./utils.js";

let bettingState = null;
let selectedType = "三連複";
let selectedStrategy = "AI案";
let currentBudget = 3000;

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
  const platformBundle = await loadRaceForAi({ raceNumber });

  if (!platformBundle.ok || !(platformBundle.horses || []).length) {
    const msg =
      platformBundle.blocked
        ? "Provider未接続（Data Source を Mock に戻してください）"
        : platformBundle.message || "レースデータを取得できませんでした";
    console.error("[ticket] data platform:", msg);
    alert(msg);
    return;
  }

  const race = platformBundle.race || {};
  const horses = platformBundle.horses || [];
  const settingsData = platformBundle.settings || {};

  const analysisResult = await analyzeRace({
    race,
    horses,
    settings: settingsData,
  });

  initIntelligenceManager();
  let engineResult = {};
  let marketResult = {};
  let learningDash = null;
  try {
    const intelPacket = await buildIntelligencePacket({
      race,
      horses,
      forceRefresh: false,
    });
    engineResult = runIntelligenceEngine({ race, horses, intelPacket });
    marketResult = runMarketEngine({
      race,
      horses,
      intelPacket,
      engineResult,
    });
    learningDash = getLearningDashboard({ ensureDemo: true });
  } catch {
    /* optional engines */
  }

  const purchaseAmountInput = document.getElementById("purchase-amount");
  currentBudget = Number(purchaseAmountInput?.value) || DEFAULT_BET || 3000;

  bettingState = runBettingEngine({
    race,
    horses,
    analysisResult,
    engineResult,
    marketResult,
    learningDash,
    budget: currentBudget,
    strategy: "バランス型",
  });

  selectedType = bettingState.dashboard?.recommendedType || "三連複";
  bindTypeButtons();
  bindStrategyButtons();
  bindBudgetControls(race, analysisResult);
  bindActions(race, analysisParams);
  bindDevPanel();
  refreshView();
}

function refreshView() {
  if (!bettingState) return;
  const bankroll = allocateBankroll(currentBudget, {
    riskLevel: bettingState.riskAnalysis?.level,
  });
  const source =
    selectedStrategy === "AI案"
      ? bettingState.tickets
      : bettingState.variants?.[selectedStrategy] || bettingState.tickets;
  const filtered =
    selectedType === "ALL"
      ? source
      : source.filter((t) => t.type === selectedType);
  const withStake = distributeToTickets(
    filtered.slice(0, 10),
    bankroll
  );

  renderDashboard(bettingState);
  renderRoles(bettingState.roles);
  renderTickets(withStake);
  renderFund(bankroll, withStake, bettingState);
  renderValueRisk(bettingState);
  renderComment(bettingState, withStake);
}

function bindTypeButtons() {
  const typeList = document.getElementById("ticket-type-list");
  if (!typeList) return;
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
    refreshView();
  });
}

function bindStrategyButtons() {
  const list = document.getElementById("strategy-list");
  if (!list) return;
  list.addEventListener("click", (event) => {
    const button = event.target.closest(".ticket-type-btn[data-strategy]");
    if (!button) return;
    selectedStrategy = button.dataset.strategy;
    list.querySelectorAll(".ticket-type-btn[data-strategy]").forEach((btn) => {
      btn.classList.toggle("is-active", btn === button);
    });
    refreshView();
  });
}

function bindBudgetControls(race, analysisResult) {
  const input = document.getElementById("purchase-amount");
  input?.addEventListener("input", () => {
    currentBudget = Number(input.value) || DEFAULT_BET;
    refreshView();
  });
  document.getElementById("budget-presets")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-budget]");
    if (!btn) return;
    currentBudget = Number(btn.dataset.budget) || 3000;
    if (input) input.value = String(currentBudget);
    // rebuild stakes with same engine output
    bettingState = {
      ...bettingState,
      bankroll: allocateBankroll(currentBudget, {
        riskLevel: bettingState.riskAnalysis?.level,
      }),
    };
    refreshView();
  });
  void race;
  void analysisResult;
}

function bindActions(race, analysisParams) {
  document.getElementById("save-ticket")?.addEventListener("click", () => {
    const tickets = collectVisibleTickets();
    saveBettingHistory({
      race,
      strategy: selectedStrategy,
      type: selectedType,
      budget: currentBudget,
      tickets,
    });
    saveTicketPrediction({
      race,
      ticketType: selectedType,
      strategy: selectedStrategy,
      amount: currentBudget,
      bets: tickets.map((t) => t.selection),
      comment: document.getElementById("ticket-ai-comment")?.textContent || "",
    });
    alert("買い目を履歴に保存しました");
  });

  document.getElementById("fav-ticket")?.addEventListener("click", () => {
    saveBettingFavorite({
      race,
      strategy: selectedStrategy,
      type: selectedType,
      budget: currentBudget,
      tickets: collectVisibleTickets(),
    });
    alert("お気に入りに追加しました");
  });

  document.getElementById("copy-ticket")?.addEventListener("click", async () => {
    const text = ticketsToJson({
      strategy: selectedStrategy,
      type: selectedType,
      tickets: collectVisibleTickets(),
    });
    const ok = await copyText(text);
    alert(ok ? "コピーしました" : "コピーに失敗しました");
  });

  document.getElementById("export-csv")?.addEventListener("click", () => {
    downloadText(
      "papapa-betting.csv",
      ticketsToCsv(collectVisibleTickets()),
      "text/csv"
    );
  });

  document.getElementById("export-json")?.addEventListener("click", () => {
    downloadText(
      "papapa-betting.json",
      ticketsToJson({
        version: "6.0.0",
        strategy: selectedStrategy,
        type: selectedType,
        budget: currentBudget,
        dashboard: bettingState?.dashboard,
        tickets: collectVisibleTickets(),
      }),
      "application/json"
    );
  });

  document.getElementById("go-ledger")?.addEventListener("click", () => {
    navigateWithFade(`balance.html?${analysisParams.toString()}`);
  });
}

function bindDevPanel() {
  const panel = document.getElementById("betting-dev-panel");
  const list = document.getElementById("betting-dev-list");
  if (!panel || !list) return;
  const enabled = Boolean(DEBUG || DEBUG_MODE);
  panel.hidden = !enabled;
  panel.classList.toggle("is-visible", enabled);
  if (!enabled || !bettingState) return;
  clearElement(list);
  const mods = bettingState.modules || {};
  Object.keys(mods).forEach((key) => {
    const li = createElement("li");
    li.textContent = `${key}: ${mods[key]}`;
    list.appendChild(li);
  });
}

function collectVisibleTickets() {
  const bankroll = allocateBankroll(currentBudget, {
    riskLevel: bettingState?.riskAnalysis?.level,
  });
  const source =
    selectedStrategy === "AI案"
      ? bettingState?.tickets || []
      : bettingState?.variants?.[selectedStrategy] || [];
  const filtered =
    selectedType === "ALL"
      ? source
      : source.filter((t) => t.type === selectedType);
  return distributeToTickets(filtered.slice(0, 10), bankroll);
}

function renderDashboard(state) {
  const d = state.dashboard || {};
  setText("bd-recovery", `${d.expectedRecovery ?? "—"}%`);
  setText("bd-risk", `${d.riskLevel || "—"} (${d.averageRisk ?? "—"})`);
  setText("bd-ev", String(d.expectedValue ?? "—"));
  setText("bd-type", d.recommendedType || "—");

  const box = document.getElementById("bd-type-compare");
  if (!box) return;
  clearElement(box);
  for (const row of d.typeComparison || []) {
    const chip = createElement("span", { className: "v60-chip" });
    chip.textContent = `${row.type}: EV${row.avgEv} / ★${Math.round((row.avgConfidence || 0) / 20)}`;
    box.appendChild(chip);
  }
}

function renderRoles(roles) {
  const box = document.getElementById("betting-roles");
  if (!box) return;
  clearElement(box);
  const blocks = [
    ["本命", roles?.labels?.honmei],
    ["対抗", roles?.labels?.taikou],
    ["穴", roles?.labels?.ana],
    ["危険馬", roles?.labels?.danger],
  ];
  for (const [label, list] of blocks) {
    const card = createElement("article", { className: "glass-card v60-role-card" });
    const h = createElement("p", { className: "v60-role-card__label" });
    h.textContent = label;
    const v = createElement("p", { className: "v60-role-card__value" });
    v.textContent = (list || [])
      .map((x) => `${x.number} ${x.name}`)
      .join(" / ") || "—";
    card.append(h, v);
    box.appendChild(card);
  }
}

function renderTickets(tickets) {
  const box = document.getElementById("ticket-bet-list");
  if (!box) return;
  clearElement(box);
  if (!tickets.length) {
    box.textContent = "該当する買い目がありません";
    return;
  }
  for (const t of tickets) {
    const card = createElement("article", { className: "glass-card v60-ticket-card" });
    const head = createElement("div", { className: "v60-ticket-card__head" });
    const title = createElement("h3");
    title.textContent = `${t.type} · ${t.formation}`;
    const conf = createElement("p", { className: "v60-ticket-card__conf" });
    const stars = Math.max(1, Math.min(5, Math.round((t.confidence || 50) / 20)));
    conf.textContent = `${"★".repeat(stars)}${"☆".repeat(5 - stars)} ${t.confidence || 0}%`;
    head.append(title, conf);

    const sel = createElement("p", { className: "v60-ticket-card__sel" });
    sel.textContent = t.selection;
    const meta = createElement("p", { className: "v60-ticket-card__meta" });
    meta.textContent = `点数 ${t.points} · 配分 ${formatYen(t.stake || 0)}円 · EV ${t.expectedValue} · リスク ${t.riskLevel} · ROI予測 ${t.roiForecast}%`;

    const why = createElement("ul", { className: "v60-ticket-card__why" });
    for (const r of t.explain?.reasons || ["総合判断"]) {
      const li = createElement("li");
      li.textContent = `・${r}`;
      why.appendChild(li);
    }

    card.append(head, sel, meta, why);
    box.appendChild(card);
  }
}

function renderFund(bankroll, tickets, state) {
  const alloc = bankroll.allocation || {};
  setText(
    "fund-allocation",
    `本線 ${formatYen(alloc["本線"] || 0)}円 / 押さえ ${formatYen(alloc["押さえ"] || 0)}円 / 穴 ${formatYen(alloc["穴"] || 0)}円`
  );
  const total = tickets.reduce((s, t) => s + (Number(t.stake) || 0), 0) || currentBudget;
  const recovery = state.dashboard?.expectedRecovery || 100;
  const payout = Math.round(total * (recovery / 100));
  const profit = payout - total;
  setText("fund-total", `${formatYen(total)}円`);
  setText("fund-payout", `${formatYen(payout)}円`);
  setText("fund-profit", `${profit >= 0 ? "+" : ""}${formatYen(profit)}円`);
  setText("fund-roi", `${recovery}%`);
}

function renderValueRisk(state) {
  const list = document.getElementById("value-summary");
  if (list) {
    clearElement(list);
    const top = (state.valueAnalysis?.horses || []).slice(0, 4);
    for (const h of top) {
      const li = createElement("li");
      li.textContent = `${h.number} ${h.name}: EV ${h.expectedValue} / ${h.label} / 妙味 ${h.mystique}`;
      list.appendChild(li);
    }
  }
  const risk = state.riskAnalysis || {};
  setText(
    "risk-summary",
    `${risk.level || "—"}（${risk.riskScore ?? "—"}） / 過剰人気 ${risk.factors?.overbetCount ?? 0}頭`
  );
}

function renderComment(state, tickets) {
  const top = tickets[0];
  const roles = state.roles?.labels || {};
  const text = [
    `推奨券種は ${state.dashboard?.recommendedType || "三連複"}。リスク ${state.riskAnalysis?.level || "—"}。`,
    `本命 ${(roles.honmei || []).map((x) => x.number).join(",") || "—"} / 穴 ${(roles.ana || []).map((x) => x.number).join(",") || "—"}。`,
    top
      ? `先頭案「${top.type} ${top.selection}」理由: ${top.explain?.summary || "総合判断"}。`
      : "該当買い目なし。",
    "人気順ではなく IQ / Value / Market / Learning を統合して提案しています。",
  ].join("\n");
  setText("ticket-ai-comment", text);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
