/* ========================================
   PAPAPA IQ KEIBA - utils.js
   共通処理 + DOMテンプレート
   ======================================== */

import {
  API_BASE_URL,
  DEBUG,
  LOADING_DURATION_MS,
  PAGE_FADE_MS,
} from "./config.js";

/** JSON読込 */
export async function loadJson(endpoint) {
  const url = `${API_BASE_URL}${endpoint}.json`;
  if (DEBUG) console.log("[loadJson]", url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json();
}

export function formatYen(value) {
  return Number(value).toLocaleString("ja-JP");
}

export function formatDateTime(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatStars(stars) {
  const count = Math.max(0, Math.min(5, Number(stars) || 0));
  return `${"★".repeat(count)}${"☆".repeat(5 - count)}`;
}

/** 星評価要素（entry-stars） */
export function createStarsElement(stars, ariaLabel) {
  const count = Math.max(0, Math.min(5, Number(stars) || 0));
  return createElement("span", {
    className: "entry-stars",
    text: formatStars(count),
    attrs: {
      "aria-label": ariaLabel || `評価 ${count}`,
    },
  });
}

export function navigateWithFade(url) {
  document.body.classList.add("is-leaving");
  setTimeout(() => {
    window.location.href = url;
  }, PAGE_FADE_MS);
}

export function updateSiteDateTime() {
  const siteDateTime = document.getElementById("site-datetime");
  if (!siteDateTime) return;
  siteDateTime.textContent = formatDateTime();
}

export function startDateTimeClock() {
  setInterval(updateSiteDateTime, 1000);
}

export function initLoadingScreen() {
  setTimeout(() => {
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) loadingScreen.classList.add("is-hidden");
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
    applyCardStagger();
  }, LOADING_DURATION_MS);
}

export function initScrollTopButton() {
  const scrollTopButton = document.getElementById("scroll-top");
  if (!scrollTopButton) return;

  scrollTopButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", () => {
    scrollTopButton.classList.toggle("is-visible", window.scrollY > 300);
  });
}

export function initPageLinkTransitions() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || link.target === "_blank") return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) return;

    let url;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return;
    }

    if (url.origin !== window.location.origin) return;
    if (!/\.html(?:$|[?#])/i.test(url.pathname)) return;

    event.preventDefault();
    document.body.classList.add("is-leaving");
    setTimeout(() => {
      window.location.href = url.href;
    }, PAGE_FADE_MS);
  });
}

export function applyCardStagger() {
  const selector =
    ".panel, .meta-panel, .race-card, .ticket-bet-card, .overall-card, .insight-card, .pace-lane, .ai-comment-card, .fund-panel, .balance-summary, .chart-card, .improve-card, .settings-panel, .status-card, .entry-table-wrap, .analysis-panel";

  document.querySelectorAll(selector).forEach((card, index) => {
    card.classList.add("anim-card");
    card.style.animationDelay = `${index * 60}ms`;
  });
}

export function initCommonUI() {
  updateSiteDateTime();
  startDateTimeClock();
  initLoadingScreen();
  initScrollTopButton();
  initPageLinkTransitions();
  setTimeout(() => applyCardStagger(), LOADING_DURATION_MS + 100);
}

export function getSearchParams() {
  return new URLSearchParams(window.location.search);
}

/* ---------- DOM テンプレート ---------- */

export function clearElement(element) {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function createElement(tag, options = {}) {
  const el = document.createElement(tag);

  if (options.className) el.className = options.className;
  if (options.id) el.id = options.id;
  if (options.text != null) el.textContent = String(options.text);
  if (options.type) el.type = options.type;
  if (options.href) el.href = options.href;
  if (options.value != null) el.value = options.value;
  if (options.name) el.name = options.name;

  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      if (value != null) el.setAttribute(key, String(value));
    });
  }

  if (options.dataset) {
    Object.entries(options.dataset).forEach(([key, value]) => {
      el.dataset[key] = value == null ? "" : String(value);
    });
  }

  if (options.onClick) {
    el.addEventListener("click", options.onClick);
  }

  if (options.children) {
    options.children.forEach((child) => {
      if (child) el.appendChild(child);
    });
  }

  return el;
}

/** ラベル生成 */
export function createLabel(text, className = "") {
  return createElement("span", { className, text });
}

/** ボタン生成 */
export function createButton({
  text,
  className = "btn-card",
  type = "button",
  dataset,
  onClick,
  attrs,
} = {}) {
  return createElement("button", {
    type,
    className,
    text,
    dataset,
    onClick,
    attrs,
  });
}

/** カード生成 */
export function createCard(className, children = []) {
  return createElement("article", { className, children });
}

/** 複数行テキスト（textContent + br） */
export function appendLines(parent, lines = []) {
  clearElement(parent);
  lines.forEach((line, index) => {
    if (index > 0) parent.appendChild(document.createElement("br"));
    parent.appendChild(document.createTextNode(line == null ? "" : String(line)));
  });
}

/** テーブル行生成（cells: Node | string） */
export function createTableRow(cells = [], className = "") {
  const tr = createElement("tr", { className });
  cells.forEach((cell) => {
    const td = document.createElement("td");
    if (typeof cell === "string" || typeof cell === "number") {
      td.textContent = String(cell);
    } else if (cell) {
      td.appendChild(cell);
    }
    tr.appendChild(td);
  });
  return tr;
}

/** テーブル本体へ行を描画 */
export function renderTableBody(tbody, rows = []) {
  clearElement(tbody);
  rows.forEach((row) => tbody.appendChild(row));
}

/** select option 生成 */
export function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

/** AI評価バッジ */
export function createAiGrade(grade, withPrefix = true) {
  const text = withPrefix ? `AI ${grade}` : String(grade);
  return createElement("span", {
    className: `ai-grade ai-grade--${String(grade).toLowerCase()}`,
    text,
    attrs: { "aria-label": `AI評価 ${grade}` },
  });
}
