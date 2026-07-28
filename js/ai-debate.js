/* ========================================
   PAPAPA IQ KEIBA - ai-debate.js
   Ver5.0.0 AI対決モード強化（表示層のみ）
   AI評価ロジック本体は変更しない
   ======================================== */

import { clearElement, createElement } from "./utils.js";

const AI_ROSTER = [
  {
    id: "gpt",
    name: "GPT Racing",
    short: "GPT",
    focus: "総合能力・勝率",
    style: "ability",
  },
  {
    id: "odds",
    name: "Deep Odds",
    short: "Odds",
    focus: "オッズ妙味・回収",
    style: "odds",
  },
  {
    id: "vision",
    name: "Horse Vision",
    short: "Vision",
    focus: "展開・脚質・位置",
    style: "pace",
  },
  {
    id: "value",
    name: "Value Hunter",
    short: "Value",
    focus: "期待値・穴狙い",
    style: "value",
  },
];

const MARKS = ["◎", "○", "▲", "☆"];

let getContext = () => ({ reports: [], result: {}, race: {} });
let debateRunning = false;
let picksCache = null;

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
    prepareDebateBoard();
  });
  startBtn?.addEventListener("click", () => {
    if (!debateRunning) startDebateTalk();
  });

  prepareDebateBoard();
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

function prepareDebateBoard() {
  const { reports, result, race } = getContext();
  picksCache = buildAiMarkSheets(reports, result, race);
  renderAiCards(picksCache);

  const banner = document.getElementById("debate-banner");
  const logRoot = document.getElementById("debate-log");
  const finalRoot = document.getElementById("debate-final");
  const startBtn = document.getElementById("debate-start-btn");

  if (banner) {
    banner.hidden = true;
    banner.classList.add("is-hidden");
    banner.classList.remove("is-show");
  }
  if (logRoot) clearElement(logRoot);
  if (finalRoot) {
    finalRoot.hidden = true;
    finalRoot.classList.add("is-hidden");
    clearElement(finalRoot);
  }
  if (startBtn) {
    startBtn.disabled = false;
    startBtn.textContent = "AI討論開始";
  }
}

function buildAiMarkSheets(reports, result, race) {
  const list = reports || [];
  const byWin = [...list].sort((a, b) => (b.winPct || 0) - (a.winPct || 0));
  const byIndex = [...list].sort((a, b) => (b.aiIndex || 0) - (a.aiIndex || 0));
  const byEv = [...list].sort((a, b) => (b.evScore || 0) - (a.evScore || 0));
  const byEvGap = [...list]
    .filter((h) => Number(h.popularity) >= 4)
    .sort((a, b) => (b.evScore || 0) - (a.evScore || 0));

  const pace = result?.paceForecast || {};
  const adv = String(pace.advantage || "");
  const prefer = adv.includes("差し")
    ? ["差し", "追込"]
    : adv.includes("先行") || adv.includes("逃げ")
      ? ["逃げ", "先行"]
      : ["先行", "差し"];
  const byPace = [...list].sort((a, b) => {
    const as = prefer.includes(a.runningStyle) ? 1 : 0;
    const bs = prefer.includes(b.runningStyle) ? 1 : 0;
    return bs - as || (b.winPct || 0) - (a.winPct || 0);
  });

  const pickFour = (ranked) => {
    const used = new Set();
    const out = [];
    ranked.forEach((h) => {
      if (out.length >= 4) return;
      if (!h || used.has(h.number)) return;
      used.add(h.number);
      out.push(h);
    });
    list.forEach((h) => {
      if (out.length >= 4) return;
      if (used.has(h.number)) return;
      used.add(h.number);
      out.push(h);
    });
    return out;
  };

  const gpt = pickFour(byWin.length ? byWin : byIndex);
  const odds = pickFour(byEv);
  const vision = pickFour(byPace);
  const value = pickFour(
    byEvGap.length ? byEvGap : byEv
  );

  return {
    gpt: {
      roster: AI_ROSTER[0],
      marks: zipMarks(gpt),
      confidence: confOf(gpt[0], 1.1),
      buy: `${gpt[0]?.horse || "上位馬"}は能力・勝率で抜けており軸に最適です。`,
      skip: `人気薄だけで攻めると安定感が落ちるため、今回は本命寄りを推奨します。`,
    },
    odds: {
      roster: AI_ROSTER[1],
      marks: zipMarks(odds),
      confidence: confOf(odds[0], 0.95),
      buy: `${odds[0]?.horse || "妙味馬"}はオッズ対勝率のバランスが良く、回収効率が高いです。`,
      skip: `過剰人気の低EV馬は見送り。単勝偏重は避けます。`,
    },
    vision: {
      roster: AI_ROSTER[2],
      marks: zipMarks(vision),
      confidence: confOf(vision[0], 1.0),
      buy: `${pace.pace || "平均"}ペース／${pace.advantage || "先行有利"}想定で${vision[0]?.horse || "展開適性馬"}が噛み合います。`,
      skip: `展開不利な脚質は割り引きます。`,
    },
    value: {
      roster: AI_ROSTER[3],
      marks: zipMarks(value),
      confidence: confOf(value[0], 0.9),
      buy: `${value[0]?.horse || "穴候補"}は人気と評価のギャップが大きく、ヒモ〜穴として妙味があります。`,
      skip: `本命一本足打法は期待値が伸びにくいため、今回は分散を推奨します。`,
    },
    meta: { race, pace, result },
  };
}

function zipMarks(horses) {
  return MARKS.map((mark, i) => ({
    mark,
    horse: horses[i] || null,
  }));
}

function confOf(horse, bias) {
  const base =
    (horse?.winPct || 12) * 1.6 +
    (horse?.aiIndex || 50) * 0.35 +
    (horse?.evScore || 80) * 0.12;
  return clamp(Math.round(base * (bias || 1)), 68, 97);
}

function renderAiCards(sheets) {
  const grid = document.getElementById("debate-ai-grid");
  if (!grid || !sheets) return;
  clearElement(grid);

  AI_ROSTER.forEach((ai) => {
    const sheet = sheets[ai.id];
    const marksWrap = createElement("div", { className: "v5-ai-marks" });
    (sheet?.marks || []).forEach((row) => {
      const h = row.horse;
      marksWrap.appendChild(
        createElement("div", {
          className: "v5-ai-mark-row",
          children: [
            createElement("span", {
              className: `v5-ai-mark mark--${markClass(row.mark)}`,
              text: row.mark,
            }),
            createElement("span", {
              className: "v5-ai-mark-horse",
              text: h
                ? `${h.number}番 ${h.horse}`
                : "—",
            }),
          ],
        })
      );
    });

    grid.appendChild(
      createElement("article", {
        className: `debate-ai glass-card v5-ai-card v5-ai-card--${ai.id}`,
        attrs: { id: `debate-ai-${ai.id}`, "data-ai": ai.id },
        children: [
          createElement("div", {
            className: "debate-ai__head",
            children: [
              createElement("span", {
                className: "debate-ai__icon",
                text: ai.short.slice(0, 1),
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
          marksWrap,
          createElement("p", {
            className: "debate-ai__conf",
            text: `信頼度 ${sheet?.confidence || 0}%`,
          }),
        ],
      })
    );
  });
}

async function startDebateTalk() {
  if (debateRunning) return;
  debateRunning = true;

  const { reports, result, race } = getContext();
  if (!picksCache) {
    picksCache = buildAiMarkSheets(reports, result, race);
    renderAiCards(picksCache);
  }

  const startBtn = document.getElementById("debate-start-btn");
  const banner = document.getElementById("debate-banner");
  const logRoot = document.getElementById("debate-log");
  const finalRoot = document.getElementById("debate-final");
  const scan = document.getElementById("debate-scan");

  if (startBtn) {
    startBtn.disabled = true;
    startBtn.textContent = "討論中…";
  }
  if (logRoot) clearElement(logRoot);
  if (finalRoot) {
    finalRoot.hidden = true;
    finalRoot.classList.add("is-hidden");
    clearElement(finalRoot);
  }

  scan?.classList.add("is-active");
  if (banner) {
    banner.hidden = false;
    banner.classList.remove("is-hidden");
    banner.classList.add("is-show");
    const text = banner.querySelector(".debate-banner__text");
    if (text) text.textContent = "4つのAIが討論を開始します";
  }
  await wait(700);
  scan?.classList.remove("is-active");

  const logs = buildDebateScript(picksCache);
  await playDebateLogs(logRoot, logs);

  const decision = buildFinalDecision(picksCache, reports, result);
  renderFinalDecision(finalRoot, decision);
  playGoldFinale();

  if (startBtn) {
    startBtn.disabled = false;
    startBtn.textContent = "AI討論開始";
  }
  debateRunning = false;
}

function buildDebateScript(sheets) {
  const g = sheets.gpt;
  const o = sheets.odds;
  const v = sheets.vision;
  const val = sheets.value;
  const g0 = g.marks[0]?.horse;
  const o0 = o.marks[0]?.horse;
  const v0 = v.marks[0]?.horse;
  const val0 = val.marks[0]?.horse;

  return [
    { ai: "gpt", text: g.buy },
    { ai: "odds", text: `反論です。${o.buy}` },
    { ai: "vision", text: v.buy },
    { ai: "value", text: `私は違います。${val.buy}` },
    { ai: "gpt", text: `買わない理由として、${g.skip}` },
    { ai: "odds", text: `買わない理由は、${o.skip}` },
    {
      ai: "vision",
      text: `${v0?.horse || "展開馬"}を軸に据えつつ、${g0?.horse || "能力上位"}も相手に残します。`,
    },
    {
      ai: "value",
      text: `${val0?.horse || "穴馬"}はヒモ〜穴で必須。${o0?.horse || "妙味馬"}との併買も検討できます。`,
    },
    { ai: "gpt", text: "能力差を無視した穴一点突破は危険です。" },
    { ai: "odds", text: "ただし回収を取るなら本命偏重も避けたい。" },
    { ai: "vision", text: "展開が噛み合うなら本命の押し切りも十分あります。" },
    {
      ai: "value",
      text: "最終的には軸は堅く、穴は相手に回すのが合理的です。",
    },
  ];
}

async function playDebateLogs(root, logs) {
  if (!root) return;
  clearElement(root);

  for (let i = 0; i < logs.length; i += 1) {
    const item = logs[i];
    const ai = AI_ROSTER.find((a) => a.id === item.ai);
    setSpeaking(item.ai);

    const bubble = createElement("article", {
      className: `debate-bubble glass-card is-speaking-bubble debate-bubble--${item.ai}`,
      children: [
        createElement("p", {
          className: "debate-bubble__speaker",
          text: `【${ai?.name || item.ai}】`,
        }),
        createElement("p", { className: "debate-bubble__text", text: "" }),
      ],
    });
    root.appendChild(bubble);
    bubble.classList.add("is-in");
    const textEl = bubble.querySelector(".debate-bubble__text");
    await typeText(textEl, item.text, 14);
    root.scrollTop = root.scrollHeight;
    await wait(220);
  }
  clearSpeaking();
}

function setSpeaking(aiId) {
  document.querySelectorAll(".v5-ai-card").forEach((card) => {
    card.classList.toggle("is-speaking", card.dataset.ai === aiId);
  });
}

function clearSpeaking() {
  document
    .querySelectorAll(".v5-ai-card.is-speaking")
    .forEach((card) => card.classList.remove("is-speaking"));
}

function buildFinalDecision(sheets, reports, result) {
  const votes = {};
  AI_ROSTER.forEach((ai) => {
    const top = sheets[ai.id]?.marks?.[0]?.horse;
    if (!top) return;
    const id = String(top.number);
    if (!votes[id]) votes[id] = { horse: top, count: 0 };
    votes[id].count += 1;
  });
  const ranked = Object.values(votes).sort(
    (a, b) =>
      b.count - a.count || (b.horse.winPct || 0) - (a.horse.winPct || 0)
  );
  const top = ranked[0]?.horse || reports?.[0];
  const agree = ranked[0]?.count || 1;
  const confidence = clamp(
    Math.round(
      (Number(result?.overall?.confidence) || 80) * 0.5 +
        agree * 10 +
        (top?.winPct || 10) * 0.5
    ),
    80,
    98
  );

  const marks = [];
  const used = new Set();
  ranked.forEach((v) => {
    if (marks.length >= 4) return;
    used.add(v.horse.number);
    marks.push(v.horse);
  });
  (reports || []).forEach((h) => {
    if (marks.length >= 4) return;
    if (used.has(h.number)) return;
    marks.push(h);
  });

  const nums = marks.map((h) => h.number);
  return {
    top,
    confidence,
    marks: MARKS.map((m, i) => ({ mark: m, horse: marks[i] || null })),
    tickets: {
      単勝: nums[0] != null ? String(nums[0]) : "—",
      馬連: nums.length >= 2 ? `${nums[0]}-${nums[1]}` : "—",
      ワイド: nums.length >= 2 ? `${nums[0]}-${nums[1]}` : "—",
      三連複:
        nums.length >= 3 ? `${nums[0]}-${nums[1]}-${nums[2]}` : "—",
      三連単:
        nums.length >= 3 ? `${nums[0]}→${nums[1]}→${nums[2]}` : "—",
    },
    reason: [
      `${agree}/4 AIが${top?.horse || "軸馬"}を本命支持。合意の中心です。`,
      `GPT Racing / Horse Vision は能力と展開の両面で軸を評価しました。`,
      `Deep Odds / Value Hunter は相手・穴に妙味を見出し、ヒモ構成を補強しています。`,
      `よって最終本命は${top?.horse || "上位馬"}、信頼度${confidence}%とします。`,
    ],
  };
}

function renderFinalDecision(root, decision) {
  if (!root || !decision) return;
  clearElement(root);
  root.hidden = false;
  root.classList.remove("is-hidden");

  const marks = createElement("div", { className: "debate-final__marks" });
  decision.marks.forEach((row) => {
    marks.appendChild(
      createElement("div", {
        className: "debate-final__mark-row",
        children: [
          createElement("span", {
            className: `debate-final__mark mark--${markClass(row.mark)}`,
            text: row.mark,
          }),
          createElement("span", {
            text: row.horse
              ? `${row.horse.number}番 ${row.horse.horse}`
              : "—",
          }),
        ],
      })
    );
  });

  const tickets = createElement("ul", { className: "debate-final__tickets" });
  Object.entries(decision.tickets).forEach(([k, v]) => {
    tickets.appendChild(createElement("li", { text: `${k}：${v}` }));
  });

  const why = createElement("div", { className: "debate-final__why" });
  why.appendChild(createElement("h4", { text: "採用理由" }));
  decision.reason.forEach((line) => {
    why.appendChild(createElement("p", { text: line }));
  });

  const confEl = createElement("span", {
    className: "debate-final__agree-value",
    text: "0%",
  });

  root.appendChild(
    createElement("div", {
      className: "debate-final glass-card v5-final-glow",
      children: [
        createElement("p", {
          className: "debate-final__eyebrow",
          text: "🤖 AI FINAL DECISION",
        }),
        createElement("p", {
          className: "debate-final__honmei",
          text: `最終本命  ${decision.top?.number || "-"}番 ${decision.top?.horse || "—"}`,
        }),
        createElement("p", {
          className: "debate-final__agree",
          children: [
            createElement("span", { text: "信頼度 " }),
            confEl,
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

  animateCountText(confEl, decision.confidence, "", "%", 900);
  requestAnimationFrame(() => {
    const bar = document.getElementById("debate-agree-bar");
    if (bar) bar.style.width = `${decision.confidence}%`;
  });
}

function playGoldFinale() {
  const flash = document.getElementById("v5-gold-flash");
  if (flash) {
    flash.classList.add("is-active");
    window.setTimeout(() => flash.classList.remove("is-active"), 700);
  }
  try {
    if (navigator.vibrate) navigator.vibrate([18, 30, 18]);
  } catch {
    /* ignore */
  }
}

function markClass(mark) {
  if (mark === "◎") return "honmei";
  if (mark === "○") return "taikou";
  if (mark === "▲") return "ana";
  if (mark === "☆") return "hoshi";
  return "x";
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function typeText(el, text, speed = 16) {
  if (!el) return;
  el.textContent = "";
  for (let i = 0; i < text.length; i += 1) {
    el.textContent += text[i];
    await wait(speed);
  }
}

function animateCountText(el, target, prefix, suffix, duration) {
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
