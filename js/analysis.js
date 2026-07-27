/* ========================================
   PAPAPA IQ KEIBA - analysis.js
   Ver3.1.0 AI競馬新聞（表示強化 / モバイル最優先）
   AIロジックは ai-engine.js をそのまま利用
   ======================================== */

import { analyzeRace } from "./ai-engine.js";
import { saveLastPrediction } from "./learning-engine.js";
import {
  appendLines,
  applyCardStagger,
  clearElement,
  createElement,
  createTableRow,
  getSearchParams,
  loadJson,
  navigateWithFade,
} from "./utils.js";

const GOLD = "#e8d48b";
const GOLD_DIM = "rgba(201, 162, 39, 0.28)";
const GOLD_FILL = "rgba(201, 162, 39, 0.32)";

const TICKET_TYPES = ["単勝", "馬連", "ワイド", "三連複", "三連単"];
const STRATEGY_UI = [
  { label: "本命", key: "本命型" },
  { label: "穴", key: "高配当型" },
  { label: "バランス", key: "バランス型" },
  { label: "AIおすすめ", key: "AIおすすめ" },
];

const MARK_CLASS = {
  "◎": "honmei",
  "○": "taikou",
  "〇": "taikou",
  "▲": "ana",
  "△": "ren",
  "☆": "hoshi",
  "×": "x",
};

const ABILITY_KEYS = [
  ["speed", "スピード", "gold"],
  ["stamina", "スタミナ", "blue"],
  ["burst", "瞬発力", "green"],
  ["pace", "展開", "gold"],
  ["track", "馬場", "blue"],
  ["distance", "距離", "green"],
];

const CONF_RING_CIRC = 2 * Math.PI * 68;
const GAUGE_LEN = 251.2;

let selectedTicketType = "三連複";
let selectedStrategy = "AIおすすめ";
let cachedTickets = null;

export async function initAnalysisPage() {
  const params = getSearchParams();
  const detailParams = new URLSearchParams({
    date: params.get("date") || "",
    venue: params.get("venue") || "",
    venueLabel: params.get("venueLabel") || "",
    race: params.get("race") || "",
    name: params.get("name") || "",
    time: params.get("time") || "",
    grade: params.get("grade") || "",
  });

  const raceNumber = Number(params.get("race") || 0);
  const [raceData, horsesData, settingsData] = await Promise.all([
    loadJson("race"),
    loadJson("horses"),
    loadJson("settings"),
  ]);

  const race =
    raceData.races.find((item) => item.number === raceNumber) ||
    raceData.races[0] ||
    {
      date: params.get("date") || "",
      venue: params.get("venue") || "",
      venueLabel: params.get("venueLabel") || "",
      number: raceNumber,
      name: params.get("name") || "",
      time: params.get("time") || "",
    };

  const analysisResult = await analyzeRace({
    race,
    horses: horsesData.entries,
    settings: settingsData,
  });

  const ranked = [...(analysisResult.horses || [])].sort(
    (a, b) =>
      (b.thinking?.score || 0) - (a.thinking?.score || 0) ||
      b.indexes.total - a.indexes.total
  );

  saveLastPrediction({
    race,
    prediction: {
      topNumbers: ranked.slice(0, 5).map((h) => h.number),
      indexes: Object.fromEntries(
        ranked.map((h) => [String(h.number), h.indexes.total])
      ),
    },
  });

  renderAnalysis(analysisResult, race);

  document.getElementById("back-to-detail").href =
    `race-detail.html?${detailParams.toString()}`;
  document.getElementById("go-ticket").addEventListener("click", () => {
    navigateWithFade(`ticket.html?${detailParams.toString()}`);
  });

  document.getElementById("detail-close")?.addEventListener("click", () => {
    hideDetail();
  });

  initRevealObserver();
}

export function renderAnalysis(result, race = {}) {
  const reports = enrichMarks(
    result.horseReports || result.horses || [],
    result.horses || []
  );
  const overall = result.overall || {};
  cachedTickets = result.tickets || null;

  const meta = document.getElementById("paper-race-meta");
  if (meta) {
    meta.textContent = [
      race.venueLabel || race.venue || "",
      race.number != null ? `${race.number}R` : "",
      race.name || "",
      race.distance ? `${race.distance}m` : "",
      race.track || "",
      race.trackCondition || "",
    ]
      .filter(Boolean)
      .join(" ｜ ");
  }

  document.getElementById("overall-grade").textContent = overall.grade || "-";
  animateCount(
    document.getElementById("overall-confidence"),
    Number(overall.confidence) || 0,
    "%",
    900
  );
  animateConfidenceRing(Number(overall.confidence) || 0);
  animateOverallGauge(gradeToGauge(overall.grade), Number(overall.confidence) || 0);

  const confBar = document.getElementById("overall-confidence-bar");
  if (confBar) {
    requestAnimationFrame(() => {
      confBar.style.width = `${clamp(overall.confidence || 0, 0, 100)}%`;
    });
  }

  animateCount(
    document.getElementById("overall-return"),
    Number(overall.expectedReturn) || 0,
    "%",
    1000
  );
  const returnBar = document.getElementById("overall-return-bar");
  if (returnBar) {
    requestAnimationFrame(() => {
      returnBar.style.width = `${clamp(overall.expectedReturn || 0, 0, 100)}%`;
    });
  }

  document.getElementById("overall-risk").textContent = overall.risk || "-";
  document.getElementById("overall-comment").textContent =
    overall.comment || "";

  renderPaceForecast(result);
  renderWinRank(reports);
  renderPaceLanes(result.paceLanes || []);
  drawCourseMap(document.getElementById("course-canvas"), result);
  renderTimeline(result, reports);
  renderMarks(reports);
  renderSpotlight(result, reports);
  renderIndexTable(reports);
  renderIndexCards(reports);

  drawRadarChart(document.getElementById("radar-chart"), result.radar);
  drawBarChart(document.getElementById("bar-chart"), reports.slice(0, 8));
  drawLineChart(document.getElementById("line-chart"), reports.slice(0, 8));
  drawPieChart(document.getElementById("pie-chart"), result.paceForecast);

  renderStyleDistribution(result.paceLanes || [], result.paceForecast);
  renderAbilityBars(reports.slice(0, 6));

  selectedTicketType = result.tickets?.defaultType || "三連複";
  selectedStrategy = "AIおすすめ";
  renderTicketTabs(result.tickets);
  renderTicketBets(result.tickets);

  appendLines(
    document.getElementById("analysis-ai-comment"),
    result.aiComment || []
  );
  document.getElementById("pace-scenario-text").textContent =
    result.paceScenario || "";
  document.getElementById("final-comment-text").textContent =
    result.finalComment || "";

  applyCardStagger();
}

function enrichMarks(list, sourceHorses = []) {
  const ranked = [...list].sort(
    (a, b) =>
      (b.thinking?.score || b.aiIndex || 0) -
        (a.thinking?.score || a.aiIndex || 0) ||
      (b.indexes?.total || 0) - (a.indexes?.total || 0)
  );
  const marks = ["◎", "○", "▲", "△", "☆"];
  return ranked.map((horse, index) => {
    const source =
      sourceHorses.find((h) => h.number === horse.number) || horse;
    let mark =
      horse.mark && ["◎", "〇", "○", "▲", "△", "☆", "注"].includes(horse.mark)
        ? horse.mark
        : index < marks.length
          ? marks[index]
          : "×";
    if (mark === "〇") mark = "○";
    if (mark === "注") mark = "×";
    const reason =
      horse.roleComment ||
      horse.comments?.[0] ||
      (mark === "◎"
        ? "思考評価・指数ともに最上位。軸候補。"
        : mark === "○"
          ? "本命に続く安定感。対抗向き。"
          : mark === "▲"
            ? "相手関係で評価。ヒモ候補。"
            : mark === "△"
              ? "展開次第で食い込み可能。"
              : mark === "☆"
                ? "人気薄だが期待値あり。穴印。"
                : "今回は評価を抑えめ。見送り寄り。");
    const indexFromTotal = Math.round((horse.indexes?.total || 0) / 10);
    const indexFromThinking = Math.round(horse.thinking?.score || 0);
    const aiIndex =
      horse.aiIndex != null
        ? horse.aiIndex
        : indexFromTotal || indexFromThinking;
    const expectedValuePercent =
      horse.expectedValuePercent != null
        ? horse.expectedValuePercent
        : Math.round(((horse.indexes?.expectedValue || 500) / 10) * 1.5);
    const winPct =
      horse.probability?.win != null
        ? Number(horse.probability.win)
        : Number(horse.winRate) || Math.max(1, aiIndex / 4);

    return {
      ...horse,
      paperMark: mark,
      markClass: MARK_CLASS[mark] || "x",
      markReason: reason,
      aiIndex,
      expectedValuePercent,
      winPct,
      risk: horse.risk || horse.riskLabel || "Medium",
      runningStyle:
        horse.runningStyle || source.runningStyle || "差し",
      popularity: horse.popularity || source.popularity || "-",
    };
  });
}

function markClassName(mark) {
  return MARK_CLASS[mark] || "x";
}

function gradeToGauge(grade) {
  const map = { S: 96, A: 84, B: 70, C: 55, D: 38, E: 22 };
  return map[String(grade || "").toUpperCase()] ?? 50;
}

function animateConfidenceRing(value) {
  const ring = document.getElementById("confidence-ring");
  const arc = document.getElementById("confidence-ring-value");
  if (!arc) return;
  const pct = clamp(value, 0, 100);
  arc.style.strokeDasharray = String(CONF_RING_CIRC);
  arc.style.strokeDashoffset = String(CONF_RING_CIRC);
  requestAnimationFrame(() => {
    arc.style.strokeDashoffset = String(
      CONF_RING_CIRC * (1 - pct / 100)
    );
    ring?.classList.add("is-animated");
  });
}

function animateOverallGauge(score, confidence) {
  const fill = document.getElementById("overall-gauge-fill");
  if (!fill) return;
  const pct = clamp(Math.max(score, confidence * 0.9), 0, 100);
  fill.style.strokeDasharray = String(GAUGE_LEN);
  fill.style.strokeDashoffset = String(GAUGE_LEN);
  requestAnimationFrame(() => {
    fill.style.strokeDashoffset = String(GAUGE_LEN * (1 - pct / 100));
  });
}

function renderPaceForecast(result) {
  const pace = result.paceForecast || {};
  const badges = document.getElementById("pace-badges");
  if (badges) {
    clearElement(badges);
    [
      { text: `ペース ${pace.pace || "平均"}`, cls: "pace-badge--pace" },
      {
        text: pace.advantage || "先行有利",
        cls: "pace-badge--adv",
      },
      {
        text: `逃${pace.nige || 0} 先${pace.senkou || 0} 差${pace.sashi || 0} 追${pace.oikomi || 0}`,
        cls: "pace-badge--count",
      },
    ].forEach((item) => {
      badges.appendChild(
        createElement("span", {
          className: `pace-badge ${item.cls}`,
          text: item.text,
        })
      );
    });
  }

  const summary = document.getElementById("pace-summary");
  if (summary) {
    summary.textContent =
      result.paceScenario ||
      `${pace.pace || "平均"}ペース想定。${pace.advantage || "先行有利"}の展開をベースに位置取りを整理しています。`;
  }
}

function renderWinRank(reports) {
  const root = document.getElementById("win-rank");
  if (!root) return;
  clearElement(root);

  const sorted = [...reports].sort(
    (a, b) => (b.winPct || 0) - (a.winPct || 0)
  );
  const max = Math.max(...sorted.map((h) => h.winPct || 0), 1);

  sorted.slice(0, 10).forEach((horse, index) => {
    const fill = createElement("span", { className: "win-rank__fill" });
    const track = createElement("div", {
      className: "win-rank__track",
      children: [fill],
    });
    const body = createElement("div", {
      className: "win-rank__body",
      children: [
        createElement("p", {
          className: "win-rank__name",
          text: `${horse.number}番 ${horse.horse}`,
        }),
        track,
      ],
    });
    root.appendChild(
      createElement("div", {
        className: "win-rank__row",
        children: [
          createElement("span", {
            className: "win-rank__pos",
            text: `${index + 1}`,
          }),
          createElement("span", {
            className: `win-rank__mark mark--${horse.markClass}`,
            text: horse.paperMark,
          }),
          body,
          createElement("span", {
            className: "win-rank__pct",
            text: `${Number(horse.winPct || 0).toFixed(1)}%`,
          }),
        ],
      })
    );
    requestAnimationFrame(() => {
      fill.style.width = `${clamp(((horse.winPct || 0) / max) * 100, 4, 100)}%`;
    });
  });
}

function renderPaceLanes(lanes) {
  const root = document.getElementById("pace-lanes");
  if (!root) return;
  clearElement(root);
  lanes.forEach((lane) => {
    const label = createElement("h3", {
      className: "pace-lane__label",
      text: lane.label,
    });
    const list = createElement("ul", { className: "pace-lane__list" });
    (lane.horses || []).forEach((horse) => {
      list.appendChild(createElement("li", { text: horse }));
    });
    root.appendChild(
      createElement("div", { className: "pace-lane", children: [label, list] })
    );
  });
}

function renderMarks(reports) {
  const root = document.getElementById("paper-marks");
  if (!root) return;
  clearElement(root);
  reports.slice(0, 12).forEach((horse) => {
    root.appendChild(
      createElement("article", {
        className: `paper-mark-row paper-mark-row--${horse.markClass}`,
        children: [
          createElement("div", {
            className: "paper-mark-row__mark",
            text: horse.paperMark,
          }),
          createElement("div", {
            className: "paper-mark-row__num",
            text: `${horse.number}番`,
          }),
          createElement("div", {
            className: "paper-mark-row__body",
            children: [
              createElement("strong", { text: horse.horse }),
              createElement("p", { text: horse.markReason }),
            ],
          }),
        ],
      })
    );
  });
}

function renderSpotlight(result, reports) {
  const danger = result.dangerHorse || {};
  const upset = result.upsetHorse || {};
  const safe = reports[0] || {};

  setText("danger-horse", danger.horse || "-");
  setGrade("danger-grade", danger.grade || "C");
  setText("danger-reason", danger.reason || "");

  setText("upset-horse", upset.horse || "-");
  setGrade("upset-grade", upset.grade || "A");
  setText("upset-reason", upset.reason || "");

  setText("safe-horse", safe.horse || "-");
  setGrade("safe-grade", safe.grade || "S");
  setText(
    "safe-reason",
    safe.roleComment ||
      `${safe.number || ""}番は思考評価・指数上位の鉄板候補です。`
  );
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setGrade(id, grade) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `ai-grade ai-grade--${String(grade).toLowerCase()}`;
  el.textContent = grade;
}

function renderIndexTable(reports) {
  const body = document.getElementById("index-rank-body");
  if (!body) return;
  clearElement(body);

  reports.forEach((horse, index) => {
    const tr = createTableRow([
      `${index + 1}`,
      horse.paperMark,
      String(horse.number),
      horse.horse,
      String(horse.aiIndex),
      `${horse.expectedValuePercent}%`,
      horse.risk,
      horse.runningStyle,
      `${horse.popularity}番人気`,
    ]);
    const markCell = tr.children[1];
    if (markCell) {
      markCell.className = `td-mark mark--${horse.markClass}`;
    }
    tr.addEventListener("click", () => {
      body.querySelectorAll("tr").forEach((row) => row.classList.remove("is-active"));
      tr.classList.add("is-active");
      document
        .querySelectorAll(".index-card")
        .forEach((card) => card.classList.remove("is-active"));
      showDetail(horse);
    });
    body.appendChild(tr);
  });
}

function renderIndexCards(reports) {
  const root = document.getElementById("index-cards");
  if (!root) return;
  clearElement(root);

  reports.forEach((horse, index) => {
    const card = createElement("article", {
      className: "index-card",
      children: [
        createElement("div", {
          className: "index-card__left",
          children: [
            createElement("span", {
              className: "index-card__rank",
              text: `${index + 1}位`,
            }),
            createElement("span", {
              className: `index-card__mark mark--${horse.markClass}`,
              text: horse.paperMark,
            }),
          ],
        }),
        createElement("div", {
          className: "index-card__main",
          children: [
            createElement("p", {
              className: "index-card__name",
              text: `${horse.number}番 ${horse.horse}`,
            }),
            createElement("p", {
              className: "index-card__meta",
              text: `${horse.runningStyle} ／ ${horse.popularity}人気 ／ 危険度 ${horse.risk}`,
            }),
          ],
        }),
        createElement("div", {
          className: "index-card__score",
          children: [
            createElement("span", {
              className: "index-card__ai",
              text: String(horse.aiIndex),
            }),
            createElement("span", {
              className: "index-card__ev",
              text: `EV ${horse.expectedValuePercent}%`,
            }),
          ],
        }),
      ],
    });
    card.addEventListener("click", () => {
      root
        .querySelectorAll(".index-card")
        .forEach((el) => el.classList.remove("is-active"));
      card.classList.add("is-active");
      showDetail(horse);
    });
    root.appendChild(card);
  });
}

function showDetail(horse) {
  const panel = document.getElementById("horse-detail");
  if (!panel) return;
  panel.hidden = false;
  panel.classList.remove("is-hidden");
  setText(
    "detail-title",
    `${horse.paperMark} ${horse.number}番 ${horse.horse}`
  );

  const bars = document.getElementById("detail-bars");
  clearElement(bars);
  const breakdown = horse.breakdown || {};
  ABILITY_KEYS.forEach(([key, label, color]) => {
    const value = Number(
      breakdown[key] != null
        ? breakdown[key]
        : horse.thinking?.factors?.[key] != null
          ? horse.thinking.factors[key]
          : 60
    );
    bars.appendChild(buildAbilityRow(label, value, color));
  });
  requestAnimationFrame(() => animateAbilityBars(bars));

  appendLines(
    document.getElementById("detail-text"),
    [
      ...(horse.comments || []),
      "",
      horse.markReason || "",
      horse.oddsLabel ? `オッズ判定: ${horse.oddsLabel}` : "",
      horse.winPct != null ? `推定勝率: ${Number(horse.winPct).toFixed(1)}%` : "",
    ].filter(Boolean)
  );
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideDetail() {
  const panel = document.getElementById("horse-detail");
  if (!panel) return;
  panel.hidden = true;
  panel.classList.add("is-hidden");
}

function buildAbilityRow(label, value, color) {
  const fill = createElement("span", {
    className: `ability-track__fill ability-track__fill--${color}`,
  });
  fill.dataset.value = String(clamp(value, 0, 100));
  return createElement("div", {
    className: "ability-row",
    children: [
      createElement("span", { className: "ability-row__label", text: label }),
      createElement("div", { className: "ability-track", children: [fill] }),
      createElement("span", {
        className: "ability-row__value",
        text: String(Math.round(value)),
      }),
    ],
  });
}

function animateAbilityBars(root) {
  root.querySelectorAll(".ability-track__fill").forEach((el) => {
    el.style.width = `${el.dataset.value || 0}%`;
  });
}

function renderStyleDistribution(lanes, pace) {
  const root = document.getElementById("style-distribution");
  if (!root) return;
  clearElement(root);
  const counts = pace?.counts || {};
  ["逃げ", "先行", "差し", "追込"].forEach((label) => {
    const lane = lanes.find((l) => l.label === label);
    const horses = (lane?.horses || []).filter((h) => h && h !== "-");
    const count =
      counts[label] != null ? counts[label] : horses.length;
    root.appendChild(
      createElement("div", {
        className: "paper-style-item",
        children: [
          createElement("p", {
            className: "paper-style-item__label",
            text: `${label}（${count}）`,
          }),
          createElement("p", {
            className: "paper-style-item__horses",
            text: horses.length ? horses.join(" / ") : "—",
          }),
        ],
      })
    );
  });
}

function renderTimeline(result, reports) {
  const root = document.getElementById("race-timeline");
  if (!root) return;
  clearElement(root);
  const pace = result.paceForecast?.pace || "平均";
  const top = reports[0];
  const closer = reports.find(
    (h) => h.runningStyle === "差し" || h.runningStyle === "追込"
  );
  const nige = reports.find((h) => h.runningStyle === "逃げ");

  const steps = [
    {
      label: "スタート",
      text: nige
        ? `${nige.number}番がハナを主張。${pace}の流れへ。`
        : "スタート直後は様子見。位置取り争い。",
    },
    {
      label: "向正面",
      text: String(pace).includes("ハイ")
        ? "テンが速く先行勢に負荷。差し待機が浮上。"
        : "ゆったりとしたラップ。逃げ先行が楽な形。",
    },
    {
      label: "3角",
      text: top
        ? `${top.number}番が好位〜中団で脚を溜める。`
        : "各馬が最終位置取りへ移行。",
    },
    {
      label: "4角",
      text: String(pace).includes("スロー")
        ? "逃げ先行が残る展開。捲りは厳しい。"
        : "後方勢が一気に進出開始。",
    },
    {
      label: "直線",
      text: closer
        ? `${closer.number}番が外から伸びてくる局面。`
        : "末脚勝負。各馬一斉にスパート。",
    },
    {
      label: "ゴール",
      text: top
        ? `AI本命 ${top.number}番の押し切り/差し切りを想定。`
        : "混戦決着の可能性も残る。",
    },
  ];

  steps.forEach((step) => {
    root.appendChild(
      createElement("div", {
        className: "paper-timeline__step",
        children: [
          createElement("p", {
            className: "paper-timeline__label",
            text: step.label,
          }),
          createElement("p", {
            className: "paper-timeline__text",
            text: step.text,
          }),
        ],
      })
    );
  });
}

function renderAbilityBars(reports) {
  const root = document.getElementById("ability-bars");
  if (!root) return;
  clearElement(root);
  reports.forEach((horse) => {
    const rows = createElement("div", { className: "paper-detail__bars" });
    ABILITY_KEYS.forEach(([key, label, color]) => {
      const raw =
        horse.breakdown?.[key] != null
          ? horse.breakdown[key]
          : horse.thinking?.factors?.[key] != null
            ? horse.thinking.factors[key]
            : 60;
      rows.appendChild(buildAbilityRow(label, Number(raw), color));
    });
    root.appendChild(
      createElement("div", {
        className: "paper-ability__horse",
        children: [
          createElement("p", {
            className: "paper-ability__name",
            text: `${horse.paperMark}${horse.number} ${horse.horse}`,
          }),
          rows,
        ],
      })
    );
  });
  requestAnimationFrame(() => animateAbilityBars(root));
}

function resolveStrategyKey(strategy, tickets) {
  if (strategy !== "AIおすすめ") return strategy;
  return (
    tickets?.defaultStrategy ||
    (tickets?.bias === "穴狙い" ? "高配当型" : "バランス型")
  );
}

function renderTicketTabs(tickets) {
  const typeTabs = document.getElementById("ticket-type-tabs");
  const strategyTabs = document.getElementById("ticket-strategy-tabs");
  if (!typeTabs || !strategyTabs) return;
  clearElement(typeTabs);
  clearElement(strategyTabs);

  STRATEGY_UI.forEach((strategy) => {
    strategyTabs.appendChild(
      createElement("button", {
        type: "button",
        className: `paper-tab${strategy.key === selectedStrategy ? " is-active" : ""}`,
        text: strategy.label,
        onClick: () => {
          selectedStrategy = strategy.key;
          renderTicketTabs(tickets || cachedTickets);
          renderTicketBets(tickets || cachedTickets);
        },
      })
    );
  });

  TICKET_TYPES.forEach((type) => {
    typeTabs.appendChild(
      createElement("button", {
        type: "button",
        className: `paper-tab${type === selectedTicketType ? " is-active" : ""}`,
        text: type,
        onClick: () => {
          selectedTicketType = type;
          renderTicketTabs(tickets || cachedTickets);
          renderTicketBets(tickets || cachedTickets);
        },
      })
    );
  });
}

function resolveTicketData(tickets, type, strategy) {
  const node = tickets?.types?.[type];
  if (!node) return null;
  const resolved = resolveStrategyKey(strategy, tickets);
  if (strategy === "AIおすすめ") {
    const base =
      node[resolved] || node["バランス型"] || node["本命型"] || node;
    return {
      ...base,
      comment: [
        `AIおすすめ（${resolved}）を自動選択しています。`,
        "",
        ...(base.comment || []),
      ],
    };
  }
  return node[resolved] || node["バランス型"] || node;
}

function renderTicketBets(tickets) {
  const list = document.getElementById("paper-ticket-bets");
  if (!list) return;
  clearElement(list);
  const data = resolveTicketData(
    tickets || cachedTickets,
    selectedTicketType,
    selectedStrategy
  );
  if (!data?.bets?.length) {
    list.appendChild(
      createElement("p", {
        className: "paper-ticket-note",
        text: "買い目データがありません",
      })
    );
    return;
  }

  data.bets.slice(0, 8).forEach((bet) => {
    const markCls = markClassName(bet.mark);
    const mark = createElement("span", {
      className: `ticket-bet-card__mark mark--${markCls}`,
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
    const meta = createElement("div", {
      className: "ticket-bet-card__meta",
      children: [
        createElement("span", {
          className: "ticket-bet-card__confidence",
          text: `AI信頼度 ${bet.confidence}%`,
        }),
      ],
    });
    list.appendChild(
      createElement("article", {
        className: "ticket-bet-card",
        children: [main, meta],
      })
    );
  });

  const note = document.getElementById("paper-ticket-note");
  if (note) note.textContent = (data.comment || []).filter(Boolean).join(" ");
}

function drawCourseMap(canvas, result) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = 900;
  const height = 420;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = GOLD_DIM;
  ctx.lineWidth = 18;
  roundRectPath(ctx, 70, 60, 760, 300, 120);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = GOLD;
  roundRectPath(ctx, 110, 100, 680, 220, 90);
  ctx.stroke();

  ctx.fillStyle = GOLD;
  ctx.font = "700 14px 'Noto Sans JP', sans-serif";
  ctx.fillText("START", 120, 50);
  ctx.fillText("GOAL", 760, 50);

  const lanes = result.paceLanes || [];
  const positions = {
    逃げ: { x: 180, y: 140 },
    先行: { x: 300, y: 170 },
    差し: { x: 480, y: 250 },
    追込: { x: 620, y: 300 },
  };

  Object.entries(positions).forEach(([label, pos]) => {
    const lane = lanes.find((l) => l.label === label);
    const horses = (lane?.horses || []).filter((h) => h && h !== "-");
    const text = horses.length
      ? `${label} ${horses
          .map((name) => {
            const hit = (result.horses || []).find((h) => h.horse === name);
            return hit ? hit.number : name;
          })
          .join(",")}`
      : label;
    drawHorseChip(ctx, pos.x, pos.y, text);
  });

  ctx.strokeStyle = GOLD;
  ctx.fillStyle = GOLD;
  ctx.lineWidth = 2;
  drawArrow(ctx, 200, 155, 280, 175);
  drawArrow(ctx, 340, 190, 460, 240);
  drawArrow(ctx, 520, 265, 600, 295);
}

function drawHorseChip(ctx, x, y, text) {
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  const w = Math.min(210, 28 + text.length * 11);
  roundRectPath(ctx, x, y, w, 32, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.font = "700 13px 'Noto Sans JP', sans-serif";
  ctx.fillText(text, x + 10, y + 21);
}

function drawArrow(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 10 * Math.cos(angle - 0.4), y2 - 10 * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - 10 * Math.cos(angle + 0.4), y2 - 10 * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
}

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawRadarChart(canvas, radar) {
  if (!canvas || !radar) return;
  const labels = radar.labels || [];
  const values = radar.values || [];
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const size = 320;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.32;
  const step = (Math.PI * 2) / Math.max(labels.length, 1);
  const start = -Math.PI / 2;

  for (let level = 4; level >= 1; level -= 1) {
    const r = (radius / 4) * level;
    ctx.beginPath();
    labels.forEach((_, i) => {
      const a = start + step * i;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = GOLD_DIM;
    ctx.fillStyle = level % 2 ? "rgba(0,0,0,0.15)" : "rgba(201,162,39,0.04)";
    ctx.fill();
    ctx.stroke();
  }

  const from = performance.now();
  const draw = (now) => {
    const t = Math.min(1, (now - from) / 700);
    const ease = 1 - Math.pow(1 - t, 3);
    ctx.beginPath();
    values.forEach((value, i) => {
      const a = start + step * i;
      const rr = radius * ((value * ease) / 100);
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = GOLD_FILL;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    if (t < 1) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);

  ctx.fillStyle = GOLD;
  ctx.font = "700 12px 'Noto Sans JP', sans-serif";
  ctx.textAlign = "center";
  labels.forEach((label, i) => {
    const a = start + step * i;
    ctx.fillText(
      label,
      cx + Math.cos(a) * (radius + 24),
      cy + Math.sin(a) * (radius + 24)
    );
  });
}

function drawBarChart(canvas, reports) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = 420;
  const height = 300;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const max = Math.max(...reports.map((h) => h.aiIndex || 1), 1);
  const gap = 10;
  const barW =
    (width - 40 - gap * (reports.length - 1)) / Math.max(reports.length, 1);
  const baseY = height - 36;

  reports.forEach((horse, i) => {
    const target = ((horse.aiIndex || 0) / max) * (height - 70);
    const x = 20 + i * (barW + gap);
    const from = performance.now();
    const animate = (now) => {
      const t = Math.min(1, (now - from) / 800);
      const h = target * (1 - Math.pow(1 - t, 3));
      ctx.clearRect(x - 1, 20, barW + 2, baseY - 18);
      const grad = ctx.createLinearGradient(0, baseY - h, 0, baseY);
      grad.addColorStop(0, GOLD);
      grad.addColorStop(1, "#8a7020");
      ctx.fillStyle = grad;
      ctx.fillRect(x, baseY - h, barW, h);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    ctx.fillStyle = GOLD;
    ctx.font = "700 11px 'Noto Sans JP', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(horse.number), x + barW / 2, height - 14);
  });
}

function drawLineChart(canvas, reports) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = 420;
  const height = 300;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const values = reports.map((h) => h.expectedValuePercent || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const points = values.map((v, i) => {
    const x = 30 + (i * (width - 60)) / Math.max(values.length - 1, 1);
    const y = 30 + ((max - v) / span) * (height - 70);
    return { x, y, n: reports[i].number };
  });

  const from = performance.now();
  const animate = (now) => {
    const t = Math.min(1, (now - from) / 900);
    const count = Math.max(2, Math.floor(points.length * t));
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = GOLD_DIM;
    ctx.beginPath();
    ctx.moveTo(20, height - 30);
    ctx.lineTo(width - 20, height - 30);
    ctx.stroke();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.slice(0, count).forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    points.slice(0, count).forEach((p) => {
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "700 11px 'Noto Sans JP', sans-serif";
      ctx.fillText(String(p.n), p.x - 4, p.y - 10);
    });
    if (t < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

function drawPieChart(canvas, pace) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const size = 300;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const data = [
    { label: "逃げ", value: pace?.nige || 0, color: "#e8d48b" },
    { label: "先行", value: pace?.senkou || 0, color: "#90caf9" },
    { label: "差し", value: pace?.sashi || 0, color: "#81c784" },
    { label: "追込", value: pace?.oikomi || 0, color: "#ef9a9a" },
  ];
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2 - 10;
  const radius = 90;
  const start = -Math.PI / 2;
  const from = performance.now();

  const animate = (now) => {
    const t = Math.min(1, (now - from) / 900);
    ctx.clearRect(0, 0, size, size);
    let angle = start;
    data.forEach((d) => {
      const slice = (d.value / total) * Math.PI * 2 * t;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = d.color;
      ctx.fill();
      angle += slice;
    });
    if (t < 1) requestAnimationFrame(animate);
    else {
      data.forEach((d, i) => {
        ctx.fillStyle = d.color;
        ctx.fillRect(30, size - 70 + i * 16, 10, 10);
        ctx.fillStyle = GOLD;
        ctx.font = "700 12px 'Noto Sans JP', sans-serif";
        ctx.fillText(`${d.label} ${d.value}`, 48, size - 61 + i * 16);
      });
    }
  };
  requestAnimationFrame(animate);
}

function animateCount(el, target, suffix = "", duration = 800) {
  if (!el) return;
  const from = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - from) / duration);
    const value = Math.round(target * (1 - Math.pow(1 - t, 3)));
    el.textContent = `${value}${suffix}`;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initRevealObserver() {
  const nodes = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    nodes.forEach((n) => n.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 }
  );
  nodes.forEach((n) => io.observe(n));
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, Number(v) || 0));
}
