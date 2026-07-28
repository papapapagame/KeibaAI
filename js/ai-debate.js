/* ========================================
   PAPAPA IQ KEIBA - ai-debate.js
   Ver4.0.0 AI対決モード（表示層のみ）
   AI評価ロジック本体は変更しない
   ======================================== */

import { clearElement, createElement } from "./utils.js";

const AI_ROSTER = [
  {
    id: "honmei",
    name: "本命AI",
    icon: "①",
    focus: "勝率・能力重視",
    steps: ["思考中…", "能力分析中…", "勝率計算中…", "完了"],
  },
  {
    id: "ana",
    name: "穴馬AI",
    icon: "②",
    focus: "期待値・人気ギャップ",
    steps: [
      "期待値分析中…",
      "人気との乖離を計算中…",
      "穴馬候補抽出中…",
      "完了",
    ],
  },
  {
    id: "data",
    name: "データAI",
    icon: "③",
    focus: "指数・過去・血統・傾向",
    steps: ["過去データ照合中…", "指数解析中…", "血統解析中…", "完了"],
  },
  {
    id: "tenkai",
    name: "展開AI",
    icon: "④",
    focus: "脚質・ペース・位置取り",
    steps: [
      "展開シミュレーション中…",
      "ペース予測中…",
      "位置取り解析中…",
      "完了",
    ],
  },
  {
    id: "odds",
    name: "オッズAI",
    icon: "⑤",
    focus: "回収率・妙味・投資効率",
    steps: [
      "オッズ取得中…",
      "期待回収率計算中…",
      "投資効率分析中…",
      "完了",
    ],
  },
];

const REACTIONS = [
  "その意見には賛成です。",
  "私は少し違う見解です。",
  "データではこちらを支持します。",
  "回収効率も無視できません。",
  "展開が噛み合えば覆る可能性があります。",
  "能力差は明確ですが、オッズ妙味も重要です。",
];

let debateStarted = false;
let debateRunning = false;
let getContext = () => ({ reports: [], result: {}, race: {} });

export function initAiDebateMode(options = {}) {
  if (typeof options.getContext === "function") {
    getContext = options.getContext;
  }

  const paperBtn = document.getElementById("tab-view-paper");
  const debateBtn = document.getElementById("tab-view-debate");
  const startBtn = document.getElementById("debate-start-btn");

  paperBtn?.addEventListener("click", () => switchView("paper"));
  debateBtn?.addEventListener("click", () => {
    switchView("debate");
    if (!debateStarted) {
      startDebate();
    }
  });
  startBtn?.addEventListener("click", () => {
    debateStarted = false;
    startDebate();
  });

  renderDebateShell();
}

function switchView(view) {
  const paper = document.getElementById("view-paper");
  const debate = document.getElementById("view-debate");
  const paperBtn = document.getElementById("tab-view-paper");
  const debateBtn = document.getElementById("tab-view-debate");

  const isPaper = view === "paper";
  if (paper) {
    paper.hidden = !isPaper;
    paper.classList.toggle("is-hidden", !isPaper);
  }
  if (debate) {
    debate.hidden = isPaper;
    debate.classList.toggle("is-hidden", isPaper);
  }
  paperBtn?.classList.toggle("is-active", isPaper);
  debateBtn?.classList.toggle("is-active", !isPaper);
}

function renderDebateShell() {
  const grid = document.getElementById("debate-ai-grid");
  if (!grid) return;
  clearElement(grid);
  AI_ROSTER.forEach((ai) => {
    grid.appendChild(
      createElement("article", {
        className: "debate-ai glass-card",
        attrs: { id: `debate-ai-${ai.id}`, "data-ai": ai.id },
        children: [
          createElement("div", {
            className: "debate-ai__head",
            children: [
              createElement("span", {
                className: "debate-ai__icon",
                text: ai.icon,
              }),
              createElement("div", {
                children: [
                  createElement("h3", {
                    className: "debate-ai__name",
                    text: ai.name,
                  }),
                  createElement("p", {
                    className: "debate-ai__focus",
                    text: ai.focus,
                  }),
                ],
              }),
            ],
          }),
          createElement("p", {
            className: "debate-ai__status",
            attrs: { id: `debate-status-${ai.id}` },
            text: "待機中",
          }),
          createElement("div", {
            className: "debate-ai__progress",
            children: [
              createElement("span", {
                className: "debate-ai__progress-fill",
                attrs: { id: `debate-progress-${ai.id}` },
              }),
            ],
          }),
          createElement("div", {
            className: "debate-ai__result is-dim",
            attrs: { id: `debate-result-${ai.id}` },
            children: [
              createElement("p", {
                className: "debate-ai__pick",
                text: "推奨馬 —",
              }),
              createElement("p", {
                className: "debate-ai__reason",
                text: "分析待機中",
              }),
              createElement("p", {
                className: "debate-ai__conf",
                text: "信頼度 —",
              }),
            ],
          }),
        ],
      })
    );
  });
}

async function startDebate() {
  if (debateRunning) return;
  debateRunning = true;
  debateStarted = true;

  const { reports, result, race } = getContext();
  const picks = buildAiPicks(reports, result, race);

  const banner = document.getElementById("debate-banner");
  const logRoot = document.getElementById("debate-log");
  const finalRoot = document.getElementById("debate-final");
  const scan = document.getElementById("debate-scan");

  if (banner) {
    banner.hidden = true;
    banner.classList.add("is-hidden");
  }
  if (finalRoot) {
    finalRoot.hidden = true;
    finalRoot.classList.add("is-hidden");
    clearElement(finalRoot);
  }
  if (logRoot) clearElement(logRoot);
  scan?.classList.add("is-active");

  renderDebateShell();

  for (let i = 0; i < AI_ROSTER.length; i += 1) {
    const ai = AI_ROSTER[i];
    const pick = picks[ai.id];
    await runAiThinking(ai, pick);
  }

  scan?.classList.remove("is-active");

  if (banner) {
    banner.hidden = false;
    banner.classList.remove("is-hidden");
    banner.classList.add("is-show");
  }
  await wait(900);

  const logs = buildDebateLogs(picks, result, race);
  await playDebateLogs(logRoot, logs);
  await wait(500);

  const decision = buildFinalDecision(picks, reports, result);
  renderFinalDecision(finalRoot, decision);
  debateRunning = false;
}

function buildAiPicks(reports, result, race) {
  const list = reports || [];
  const byWin = [...list].sort((a, b) => (b.winPct || 0) - (a.winPct || 0));
  const byIndex = [...list].sort((a, b) => (b.aiIndex || 0) - (a.aiIndex || 0));
  const byEvGap = [...list]
    .filter((h) => Number(h.popularity) >= 4)
    .sort(
      (a, b) =>
        (b.evScore || 0) - (a.evScore || 0) ||
        Number(b.popularity) - Number(a.popularity)
    );
  const byEv = [...list].sort((a, b) => (b.evScore || 0) - (a.evScore || 0));

  const pace = result?.paceForecast || {};
  const adv = String(pace.advantage || "");
  const stylePrefer = adv.includes("差し")
    ? ["差し", "追込"]
    : adv.includes("先行") || adv.includes("逃げ")
      ? ["逃げ", "先行"]
      : ["先行", "差し"];
  const byTenkai = [...list].sort((a, b) => {
    const as = stylePrefer.includes(a.runningStyle) ? 1 : 0;
    const bs = stylePrefer.includes(b.runningStyle) ? 1 : 0;
    return bs - as || (b.winPct || 0) - (a.winPct || 0);
  });

  const upsetNamed = result?.upsetHorse?.horse
    ? list.find((h) => h.horse === result.upsetHorse.horse)
    : null;

  const honmei = byWin[0] || byIndex[0] || list[0];
  const ana = upsetNamed || byEvGap[0] || byEv[0] || list[1] || honmei;
  const data = byIndex[0] || honmei;
  const tenkai = byTenkai[0] || honmei;
  const odds = byEv[0] || ana || honmei;

  return {
    honmei: {
      horse: honmei,
      reason: `${honmei?.horse || "上位馬"}は勝率${honmei?.winPct || 0}%・AI指数${honmei?.aiIndex || 0}で能力が抜けています。`,
      confidence: clamp(
        Math.round((honmei?.winPct || 20) * 2.2 + (honmei?.aiIndex || 50) * 0.35),
        72,
        97
      ),
    },
    ana: {
      horse: ana,
      reason: `${ana?.horse || "穴候補"}は人気${ana?.popularity || "-"}番手に対しEV${ana?.evScore || 0}%と妙味が目立ちます。`,
      confidence: clamp(
        Math.round((ana?.evScore || 80) * 0.45 + Number(ana?.popularity || 5)),
        68,
        94
      ),
    },
    data: {
      horse: data,
      reason: `指数・近走バランスで${data?.horse || "データ上位"}を支持。過去内容と指数の整合が取れています。`,
      confidence: clamp(
        Math.round((data?.aiIndex || 50) * 0.7 + (data?.confidence || 70) * 0.25),
        70,
        96
      ),
    },
    tenkai: {
      horse: tenkai,
      reason: `${pace.pace || "平均"}ペース／${pace.advantage || "先行有利"}想定で、${tenkai?.runningStyle || "好位"}の${tenkai?.horse || "展開適性馬"}が噛み合います。`,
      confidence: clamp(
        Math.round(78 + (tenkai?.winPct || 10) * 0.4),
        66,
        93
      ),
    },
    odds: {
      horse: odds,
      reason: `オッズ${odds?.odds || "-"}倍に対し推定勝率${odds?.winPct || 0}%。回収効率を重視すると${odds?.horse || "妙味馬"}です。`,
      confidence: clamp(
        Math.round((odds?.evScore || 80) * 0.5 + 20),
        65,
        95
      ),
    },
    meta: { race, pace },
  };
}

async function runAiThinking(ai, pick) {
  const card = document.getElementById(`debate-ai-${ai.id}`);
  const status = document.getElementById(`debate-status-${ai.id}`);
  const fill = document.getElementById(`debate-progress-${ai.id}`);
  const resultBox = document.getElementById(`debate-result-${ai.id}`);
  card?.classList.add("is-thinking");

  for (let i = 0; i < ai.steps.length; i += 1) {
    if (status) status.textContent = ai.steps[i];
    if (fill) fill.style.width = `${((i + 1) / ai.steps.length) * 100}%`;
    await wait(i === ai.steps.length - 1 ? 280 : 420);
  }

  card?.classList.remove("is-thinking");
  card?.classList.add("is-done");
  if (resultBox) {
    resultBox.classList.remove("is-dim");
    const horse = pick?.horse;
    clearElement(resultBox);
    resultBox.appendChild(
      createElement("p", {
        className: "debate-ai__pick",
        text: horse
          ? `推奨馬 ${horse.paperMark || ""} ${horse.number}番 ${horse.horse}`
          : "推奨馬 —",
      })
    );
    resultBox.appendChild(
      createElement("p", {
        className: "debate-ai__reason",
        text: pick?.reason || "",
      })
    );
    const confEl = createElement("p", {
      className: "debate-ai__conf",
      text: "信頼度 0%",
    });
    resultBox.appendChild(confEl);
    await animateCountText(confEl, pick?.confidence || 0, "信頼度 ", "%", 700);
  }
}

function buildDebateLogs(picks, result, race) {
  const pace = result?.paceForecast || {};
  const lines = [
    {
      speaker: "本命AI",
      text: `能力では${picks.honmei.horse?.horse || "この馬"}が抜けています。`,
    },
    {
      speaker: "穴馬AI",
      text: `期待値は${picks.ana.horse?.horse || "こちら"}の方が高いです。`,
    },
    { speaker: "本命AI", text: REACTIONS[0] },
    {
      speaker: "展開AI",
      text: `今回は${pace.pace || "平均"}ペース濃厚です。${pace.advantage || "先行有利"}を意識すべきです。`,
    },
    {
      speaker: "データAI",
      text: `${race?.venueLabel || "開催場"}近走傾向と指数では${picks.data.horse?.horse || "上位馬"}を支持します。`,
    },
    { speaker: "穴馬AI", text: REACTIONS[1] },
    {
      speaker: "オッズAI",
      text: `回収率重視なら${picks.odds.horse?.horse || "妙味馬"}です。`,
    },
    { speaker: "データAI", text: REACTIONS[2] },
    {
      speaker: "展開AI",
      text: REACTIONS[4],
    },
    {
      speaker: "本命AI",
      text: `最終的には軸を${picks.honmei.horse?.horse || "本命"}に置き、穴は抑えが妥当です。`,
    },
    { speaker: "オッズAI", text: REACTIONS[3] },
    {
      speaker: "穴馬AI",
      text: `${picks.ana.horse?.horse || "穴馬"}は相手候補として残すべきです。`,
    },
  ];
  return lines;
}

async function playDebateLogs(root, logs) {
  if (!root) return;
  clearElement(root);
  for (let i = 0; i < logs.length; i += 1) {
    const item = logs[i];
    const bubble = createElement("article", {
      className: "debate-bubble glass-card",
      children: [
        createElement("p", {
          className: "debate-bubble__speaker",
          text: `【${item.speaker}】`,
        }),
        createElement("p", {
          className: "debate-bubble__text",
          text: "",
        }),
      ],
    });
    root.appendChild(bubble);
    bubble.classList.add("is-in");
    const textEl = bubble.querySelector(".debate-bubble__text");
    await typeText(textEl, item.text, 16);
    root.scrollTop = root.scrollHeight;
    await wait(280);
  }
}

function buildFinalDecision(picks, reports, result) {
  const votes = {};
  Object.keys(picks).forEach((key) => {
    if (key === "meta") return;
    const h = picks[key]?.horse;
    if (!h) return;
    const id = String(h.number);
    if (!votes[id]) votes[id] = { horse: h, count: 0 };
    votes[id].count += 1;
  });

  const rankedVotes = Object.values(votes).sort(
    (a, b) =>
      b.count - a.count ||
      (b.horse.winPct || 0) - (a.horse.winPct || 0)
  );

  const marks = ["◎", "○", "▲", "△", "☆"];
  const markList = rankedVotes.slice(0, 5).map((v, i) => ({
    mark: marks[i],
    horse: v.horse,
    votes: v.count,
  }));

  const top = markList[0]?.horse || reports?.[0];
  const agreeCount = rankedVotes[0]?.count || 1;
  const baseConf = Number(result?.overall?.confidence) || 80;
  const agreement = clamp(
    Math.round(baseConf * 0.55 + agreeCount * 8 + (top?.winPct || 10) * 0.6),
    78,
    98
  );
  const stars = agreement >= 94 ? 5 : agreement >= 88 ? 4 : agreement >= 80 ? 3 : 2;

  const nums = markList.map((m) => m.horse.number).filter(Boolean);
  const tickets = {
    単勝: nums[0] != null ? `${nums[0]}` : "—",
    馬連:
      nums.length >= 2 ? `${nums[0]}-${nums[1]}` : nums[0] != null ? `${nums[0]}` : "—",
    ワイド:
      nums.length >= 2 ? `${nums[0]}-${nums[1]}` : "—",
    三連複:
      nums.length >= 3
        ? `${nums[0]}-${nums[1]}-${nums[2]}`
        : nums.slice(0, 3).join("-") || "—",
    三連単:
      nums.length >= 3
        ? `${nums[0]}→${nums[1]}→${nums[2]}`
        : nums.slice(0, 3).join("→") || "—",
  };

  const why = [
    `5つのAIのうち${agreeCount}つが${top?.horse || "軸馬"}を支持し、合意率は${agreement}%です。`,
    `本命AIとデータAIは能力・指数面で一致し、展開AIも${result?.paceForecast?.advantage || "想定展開"}と噛み合うと判断しました。`,
    `一方で穴馬AIとオッズAIは${picks.ana?.horse?.horse || "人気薄"}の期待値を評価しており、相手候補として組み込んでいます。`,
    `以上より、印は能力上位を軸に、妙味馬をヒモへ回す結論としました。`,
  ];

  return { agreement, stars, markList, tickets, why, top };
}

function renderFinalDecision(root, decision) {
  if (!root || !decision) return;
  clearElement(root);
  root.hidden = false;
  root.classList.remove("is-hidden");

  const stars = createElement("p", {
    className: "debate-final__stars",
    text: `${"★".repeat(decision.stars)}${"☆".repeat(5 - decision.stars)}`,
  });

  const agreeValue = createElement("span", {
    className: "debate-final__agree-value",
    text: "0%",
  });

  const marks = createElement("div", { className: "debate-final__marks" });
  decision.markList.forEach((item) => {
    marks.appendChild(
      createElement("div", {
        className: "debate-final__mark-row",
        children: [
          createElement("span", {
            className: `debate-final__mark mark--${markClass(item.mark)}`,
            text: item.mark,
          }),
          createElement("span", {
            text: `${item.horse.number}番 ${item.horse.horse}`,
          }),
          createElement("span", {
            className: "debate-final__votes",
            text: `支持 ${item.votes}/5`,
          }),
        ],
      })
    );
  });

  const tickets = createElement("ul", { className: "debate-final__tickets" });
  Object.entries(decision.tickets).forEach(([type, combo]) => {
    tickets.appendChild(
      createElement("li", { text: `${type}：${combo}` })
    );
  });

  const why = createElement("div", { className: "debate-final__why" });
  why.appendChild(
    createElement("h4", { text: "なぜこの結論になったのか" })
  );
  decision.why.forEach((line) => {
    why.appendChild(createElement("p", { text: line }));
  });

  root.appendChild(
    createElement("div", {
      className: "debate-final glass-card",
      children: [
        createElement("p", {
          className: "debate-final__eyebrow",
          text: "🤖 AI FINAL DECISION",
        }),
        stars,
        createElement("p", {
          className: "debate-final__agree",
          children: [
            createElement("span", { text: "AI合意率 " }),
            agreeValue,
          ],
        }),
        createElement("div", {
          className: "paper-meter debate-final__meter",
          children: [
            createElement("span", {
              className: "paper-meter__fill",
              attrs: { id: "debate-agree-bar" },
            }),
          ],
        }),
        createElement("h4", { text: "推奨印" }),
        marks,
        createElement("h4", { text: "推奨買い目" }),
        tickets,
        why,
      ],
    })
  );

  animateCountText(agreeValue, decision.agreement, "", "%", 1000);
  const bar = document.getElementById("debate-agree-bar");
  requestAnimationFrame(() => {
    if (bar) bar.style.width = `${decision.agreement}%`;
  });
}

function markClass(mark) {
  if (mark === "◎") return "honmei";
  if (mark === "○") return "taikou";
  if (mark === "▲") return "ana";
  if (mark === "△") return "ren";
  if (mark === "☆") return "hoshi";
  return "x";
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function typeText(el, text, speed = 18) {
  if (!el) return;
  el.textContent = "";
  for (let i = 0; i < text.length; i += 1) {
    el.textContent += text[i];
    await wait(speed);
  }
}

function animateCountText(el, target, prefix = "", suffix = "", duration = 800) {
  return new Promise((resolve) => {
    if (!el) {
      resolve();
      return;
    }
    const from = performance.now();
    const goal = Number(target) || 0;
    const tick = (now) => {
      const t = Math.min(1, (now - from) / duration);
      const value = Math.round(goal * (1 - Math.pow(1 - t, 3)));
      el.textContent = `${prefix}${value}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, Number(v) || 0));
}
