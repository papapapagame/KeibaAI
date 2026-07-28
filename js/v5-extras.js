/* ========================================
   PAPAPA IQ KEIBA - v5-extras.js
   Ver5.0.0 思考ログ / 履歴 / ニュース / ランキング / 完了演出
   表示層のみ（AI評価ロジックは変更しない）
   ======================================== */

import { clearElement, createElement } from "./utils.js";

const THINK_STEPS = [
  "過去レース検索...",
  "展開分析...",
  "脚質比較...",
  "騎手補正...",
  "馬場適性...",
  "人気補正...",
  "期待値算出...",
  "最終評価...",
];

const AI_HISTORY = [
  {
    name: "GPT Racing",
    color: "#e8d48b",
    conf: [82, 84, 79, 88, 90, 86, 91, 87, 89, 92],
    ev: [98, 102, 95, 110, 108, 104, 112, 106, 109, 115],
    win: [18, 20, 16, 22, 24, 21, 25, 23, 22, 26],
  },
  {
    name: "Deep Odds",
    color: "#90caf9",
    conf: [78, 80, 77, 83, 85, 81, 86, 84, 82, 88],
    ev: [112, 118, 105, 122, 126, 119, 130, 124, 121, 128],
    win: [12, 14, 11, 15, 16, 13, 17, 15, 14, 18],
  },
  {
    name: "Horse Vision",
    color: "#81c784",
    conf: [80, 81, 83, 85, 84, 86, 88, 87, 89, 90],
    ev: [100, 101, 103, 107, 105, 108, 110, 109, 111, 113],
    win: [15, 16, 17, 18, 17, 19, 20, 19, 21, 22],
  },
  {
    name: "Value Hunter",
    color: "#ce93d8",
    conf: [74, 76, 75, 79, 81, 78, 82, 80, 83, 85],
    ev: [120, 125, 118, 132, 135, 128, 138, 133, 130, 140],
    win: [9, 10, 8, 11, 12, 10, 13, 12, 11, 14],
  },
];

const NEWS = [
  {
    tag: "注目",
    title: "AI注目馬ランキング",
    body: "本日の指数上位は能力差が明確。軸候補の信頼度が上昇しています。",
  },
  {
    tag: "警告",
    title: "本日の危険人気馬",
    body: "人気先行で期待値が伸びない馬をAIが検知。単勝偏重に注意。",
  },
  {
    tag: "EV",
    title: "期待値ランキング",
    body: "中穴帯の妙味が厚い一戦。ワイド・三連複向きの配分が有効です。",
  },
  {
    tag: "速報",
    title: "穴馬速報",
    body: "人気薄ながら展開適性が高い馬を抽出。ヒモ候補として浮上。",
  },
  {
    tag: "馬場",
    title: "馬場傾向速報",
    body: "内側有利の気配。先行〜好位差しが残りやすい想定です。",
  },
];

const RANKING = [
  { name: "GPT Racing", win: 24.8, roi: 108.2, hit: 41.5, ev: 106 },
  { name: "Deep Odds", win: 16.4, roi: 121.6, hit: 33.2, ev: 124 },
  { name: "Horse Vision", win: 21.1, roi: 112.4, hit: 38.7, ev: 111 },
  { name: "Value Hunter", win: 13.6, roi: 129.8, hit: 29.4, ev: 132 },
];

let audioCtx = null;

export function initV5Extras(options = {}) {
  renderThinkingShell();
  renderHistory();
  renderNews();
  renderRanking();

  if (options.autoThink !== false) {
    window.setTimeout(() => runThinkingLog(), 450);
  }
}

export async function runThinkingLog() {
  const list = document.getElementById("v5-think-list");
  const bar = document.getElementById("v5-think-bar");
  const pct = document.getElementById("v5-think-pct");
  if (!list || !bar || !pct) return;

  clearElement(list);
  bar.style.width = "0%";
  pct.textContent = "0%";

  for (let i = 0; i < THINK_STEPS.length; i += 1) {
    const progress = Math.round(((i + 1) / THINK_STEPS.length) * 100);
    const row = createElement("li", {
      className: "v5-think-item is-active",
      text: THINK_STEPS[i],
    });
    list.appendChild(row);
    bar.style.width = `${progress}%`;
    await animatePct(pct, progress, 280);
    await wait(260);
    row.classList.remove("is-active");
    row.classList.add("is-done");
  }

  await playCompleteFx();
}

function renderThinkingShell() {
  const list = document.getElementById("v5-think-list");
  if (!list) return;
  clearElement(list);
  list.appendChild(
    createElement("li", {
      className: "v5-think-item",
      text: "分析待機中...",
    })
  );
}

function renderHistory() {
  const root = document.getElementById("v5-history");
  if (!root) return;
  clearElement(root);

  AI_HISTORY.forEach((ai) => {
    const avgConf = avg(ai.conf);
    const avgEv = avg(ai.ev);
    const avgWin = avg(ai.win);
    const card = createElement("article", {
      className: "v5-history-card glass-card",
      children: [
        createElement("h3", {
          className: "v5-history-card__title",
          text: ai.name,
        }),
        createElement("p", {
          className: "v5-history-card__meta",
          text: `平均信頼度 ${avgConf.toFixed(1)}% ／ 平均EV ${avgEv.toFixed(1)}% ／ 平均勝率 ${avgWin.toFixed(1)}%`,
        }),
      ],
    });
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 120;
    canvas.className = "v5-history-canvas";
    canvas.setAttribute("aria-label", `${ai.name} 直近10レース`);
    card.appendChild(canvas);
    root.appendChild(card);
    drawSparkline(canvas, ai.conf, ai.color);
  });
}

function renderNews() {
  const root = document.getElementById("v5-news");
  if (!root) return;
  clearElement(root);
  NEWS.forEach((item) => {
    root.appendChild(
      createElement("article", {
        className: "v5-news-card glass-card",
        children: [
          createElement("p", {
            className: "v5-news-card__tag",
            text: item.tag,
          }),
          createElement("h3", {
            className: "v5-news-card__title",
            text: item.title,
          }),
          createElement("p", {
            className: "v5-news-card__body",
            text: item.body,
          }),
        ],
      })
    );
  });
}

function renderRanking() {
  const root = document.getElementById("v5-ranking");
  if (!root) return;
  clearElement(root);
  const sorted = [...RANKING].sort((a, b) => b.roi - a.roi);
  sorted.forEach((row, index) => {
    root.appendChild(
      createElement("article", {
        className: "v5-rank-row glass-card",
        children: [
          createElement("span", {
            className: "v5-rank-row__pos",
            text: `${index + 1}`,
          }),
          createElement("div", {
            className: "v5-rank-row__main",
            children: [
              createElement("p", {
                className: "v5-rank-row__name",
                text: row.name,
              }),
              createElement("p", {
                className: "v5-rank-row__meta",
                text: `勝率 ${row.win}% ／ 的中 ${row.hit}% ／ EV ${row.ev}%`,
              }),
            ],
          }),
          createElement("span", {
            className: "v5-rank-row__roi",
            text: `${row.roi}%`,
          }),
        ],
      })
    );
  });
}

async function playCompleteFx() {
  const overlay = document.getElementById("v5-complete-overlay");
  const flash = document.getElementById("v5-gold-flash");
  flash?.classList.add("is-active");
  overlay?.classList.add("is-active");
  try {
    if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
  } catch {
    /* ignore */
  }
  playBeep();
  await wait(1100);
  overlay?.classList.remove("is-active");
  flash?.classList.remove("is-active");
}

function playBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioCtx) audioCtx = new AudioContext();
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    /* ignore autoplay restrictions */
  }
}

function drawSparkline(canvas, values, color) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(201,162,39,0.2)";
  ctx.beginPath();
  ctx.moveTo(10, h - 16);
  ctx.lineTo(w - 10, h - 16);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = 12 + (i * (w - 24)) / Math.max(values.length - 1, 1);
    const y = 14 + ((max - v) / span) * (h - 36);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  values.forEach((v, i) => {
    const x = 12 + (i * (w - 24)) / Math.max(values.length - 1, 1);
    const y = 14 + ((max - v) / span) * (h - 36);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function animatePct(el, target, duration) {
  return new Promise((resolve) => {
    const from = performance.now();
    const start = Number(String(el.textContent).replace("%", "")) || 0;
    const tick = (now) => {
      const t = Math.min(1, (now - from) / duration);
      const value = Math.round(start + (target - start) * t);
      el.textContent = `${value}%`;
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
