/* ========================================
   PAPAPA IQ KEIBA - analysis.js
   Ver3.0.0 AI競馬新聞レイアウト（表示のみ強化）
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
  { label: "バランス", key: "バランス型" },
  { label: "穴狙い", key: "高配当型" },
  { label: "AI対抗", key: "AI対抗" },
];

const ABILITY_KEYS = [
  ["speed", "スピード", "gold"],
  ["stamina", "スタミナ", "blue"],
  ["burst", "瞬発力", "green"],
  ["pace", "展開", "gold"],
  ["track", "馬場", "blue"],
  ["distance", "距離", "green"],
];

let selectedTicketType = "三連複";
let selectedStrategy = "バランス型";

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
  const reports = enrichMarks(result.horseReports || result.horses || []);
  const overall = result.overall || {};

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
  const bar = document.getElementById("overall-confidence-bar");
  if (bar) {
    requestAnimationFrame(() => {
      bar.style.width = `${clamp(overall.confidence || 0, 0, 100)}%`;
    });
  }
  animateCount(
    document.getElementById("overall-return"),
    Number(overall.expectedReturn) || 0,
    "%",
    1000
  );
  document.getElementById("overall-risk").textContent = overall.risk || "-";
  document.getElementById("overall-comment").textContent =
    overall.comment || "";

  const pace = result.paceForecast || {};
  document.getElementById("pace-summary").textContent =
    `${pace.pace || "平均"} ／ ${pace.advantage || "先行有利"} ／ 逃げ${pace.nige || 0} 先行${pace.senkou || 0} 差し${pace.sashi || 0} 追込${pace.oikomi || 0}`;

  renderPaceLanes(result.paceLanes || []);
  drawCourseMap(document.getElementById("course-canvas"), result);
  renderMarks(reports);
  renderSpotlight(result, reports);
  renderIndexTable(reports);

  drawRadarChart(document.getElementById("radar-chart"), result.radar);
  drawBarChart(document.getElementById("bar-chart"), reports.slice(0, 8));
  drawLineChart(document.getElementById("line-chart"), reports.slice(0, 8));
  drawPieChart(document.getElementById("pie-chart"), result.paceForecast);

  renderStyleDistribution(result.paceLanes || [], result.paceForecast);
  renderTimeline(result, reports);
  renderAbilityBars(reports.slice(0, 6));

  selectedTicketType = result.tickets?.defaultType || "三連複";
  selectedStrategy = result.tickets?.defaultStrategy || "バランス型";
  renderTicketTabs(result.tickets);
  renderTicketBets(result.tickets);

  appendLines(document.getElementById("analysis-ai-comment"), result.aiComment || []);
  document.getElementById("pace-scenario-text").textContent =
    result.paceScenario || "";
  document.getElementById("final-comment-text").textContent =
    result.finalComment || "";

  applyCardStagger();
}

function enrichMarks(list) {
  const ranked = [...list].sort(
    (a, b) =>
      (b.thinking?.score || b.aiIndex || 0) -
        (a.thinking?.score || a.aiIndex || 0) ||
      (b.indexes?.total || 0) - (a.indexes?.total || 0)
  );
  const marks = ["◎", "○", "▲", "△", "☆"];
  return ranked.map((horse, index) => {
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

    return {
      ...horse,
      paperMark: mark,
      markReason: reason,
      aiIndex,
      expectedValuePercent,
      risk: horse.risk || horse.riskLabel || "Medium",
      runningStyle: horse.runningStyle || "差し",
      popularity: horse.popularity || "-",
    };
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
        className: "paper-mark-row",
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
    tr.addEventListener("click", () => {
      body.querySelectorAll("tr").forEach((row) => row.classList.remove("is-active"));
      tr.classList.add("is-active");
      showDetail(horse);
    });
    body.appendChild(tr);
  });
}

function showDetail(horse) {
  const panel = document.getElementById("horse-detail");
  if (!panel) return;
  panel.hidden = false;
  panel.classList.remove("is-hidden");
  setText("detail-title", `${horse.paperMark} ${horse.number}番 ${horse.horse}`);

  const bars = document.getElementById("detail-bars");
  clearElement(bars);
  const breakdown = horse.breakdown || {};
  ABILITY_KEYS.forEach(([key, label, color]) => {
    const value = Number(breakdown[key] ?? horse.thinking?.factors?.[key] ?? 60);
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
    root.appendChild(
      createElement("div", {
        className: "paper-style-item",
        children: [
          createElement("p", {
            className: "paper-style-item__label",
            text: `${label}（${counts[label] ?? horses.length}）`,
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
      text:
        String(pace).includes("スロー")
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
      const value = Number(
        horse.breakdown?.[key] ?? horse.thinking?.factors?.[key] ?? 60
      );
      rows.appendChild(buildAbilityRow(label, value, color));
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

function renderTicketTabs(tickets) {
  const typeTabs = document.getElementById("ticket-type-tabs");
  const strategyTabs = document.getElementById("ticket-strategy-tabs");
  if (!typeTabs || !strategyTabs) return;
  clearElement(typeTabs);
  clearElement(strategyTabs);

  TICKET_TYPES.forEach((type) => {
    typeTabs.appendChild(
      createElement("button", {
        type: "button",
        className: `paper-tab${type === selectedTicketType ? " is-active" : ""}`,
        text: type,
        onClick: () => {
          selectedTicketType = type;
          renderTicketTabs(tickets);
          renderTicketBets(tickets);
        },
      })
    );
  });

  STRATEGY_UI.forEach((strategy) => {
    strategyTabs.appendChild(
      createElement("button", {
        type: "button",
        className: `paper-tab${strategy.key === selectedStrategy ? " is-active" : ""}`,
        text: strategy.label,
        onClick: () => {
          selectedStrategy = strategy.key;
          renderTicketTabs(tickets);
          renderTicketBets(tickets);
        },
      })
    );
  });
}

function resolveTicketData(tickets, type, strategy) {
  const node = tickets?.types?.[type];
  if (!node) return null;
  if (strategy === "AI対抗") {
    const base = node["バランス型"] || node["本命型"] || node;
    return {
      ...base,
      comment: [
        "AI対抗表示: 思考評価2番手以降を意識した見方です。",
        "",
        ...(base.comment || []),
      ],
    };
  }
  return node[strategy] || node["バランス型"] || node;
}

function renderTicketBets(tickets) {
  const list = document.getElementById("paper-ticket-bets");
  if (!list) return;
  clearElement(list);
  const data = resolveTicketData(tickets, selectedTicketType, selectedStrategy);
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
    { threshold: 0.12 }
  );
  nodes.forEach((n) => io.observe(n));
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, Number(v) || 0));
}
