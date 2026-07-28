/* ========================================
   past-race.js — 過去レース振り返り UI
   ======================================== */

import {
  buildPastRaceReport,
  isPastRaceDate,
  isWithinRetentionWindow,
  retentionBlockedMessage,
  PAST_RACE_REPORT_VERSION,
} from "../services/review/past-race-report.js";
import {
  clearElement,
  createElement,
  getSearchParams,
} from "./utils.js";

export async function initPastRacePage() {
  const params = getSearchParams();
  const date = params.get("date") || "";
  const venue = params.get("venue") || "";
  const venueLabel = params.get("venueLabel") || "";
  const race = params.get("race") || "";
  const name = params.get("name") || "";
  const raceId = params.get("raceId") || "";

  const detailParams = new URLSearchParams({
    date,
    venue,
    venueLabel,
    race,
    name,
    time: params.get("time") || "",
    grade: params.get("grade") || "",
    stage: params.get("stage") || "",
    raceId,
  });
  const listParams = new URLSearchParams({ date, venue, venueLabel });

  const backDetail = document.getElementById("past-back-detail");
  const backList = document.getElementById("past-back-list");
  if (backDetail) backDetail.href = `race-detail.html?${detailParams.toString()}`;
  if (backList) backList.href = `race-list.html?${listParams.toString()}`;

  setText("past-date", date || "—");
  setText("past-venue", venueLabel || venue || "—");
  setText(
    "past-race-label",
    race ? `${race}R ${name || ""}`.trim() : name || "—"
  );

  if (date && !isWithinRetentionWindow(date)) {
    const err = document.getElementById("past-error");
    if (err) {
      err.hidden = false;
      err.textContent = retentionBlockedMessage();
    }
    setText("past-summary", retentionBlockedMessage());
    return;
  }

  const report = await buildPastRaceReport({
    date,
    venueId: venue,
    venue,
    raceNumber: Number(race) || 0,
    raceId,
  });

  const err = document.getElementById("past-error");
  if (!report.ok) {
    if (err) {
      err.hidden = false;
      err.textContent = report.userMessage || report.message || "結果がありません";
    }
    setText(
      "past-summary",
      report.expired
        ? retentionBlockedMessage()
        : isPastRaceDate(date)
          ? "この開催日は過去ですが、結果データが未登録です。"
          : "過去レースの結果データが見つかりません。"
    );
    return;
  }

  if (err) err.hidden = true;

  const raceMeta = report.race || {};
  setText("past-date", raceMeta.date || date || "—");
  setText("past-venue", raceMeta.venueLabel || venueLabel || venue || "—");
  setText(
    "past-race-label",
    `${raceMeta.number || race || "—"}R ${raceMeta.name || name || ""}`.trim()
  );
  setText(
    "past-cond",
    [
      raceMeta.track,
      raceMeta.distance ? `${raceMeta.distance}m` : "",
      raceMeta.trackCondition,
      raceMeta.weather,
    ]
      .filter(Boolean)
      .join(" · ") || "—"
  );
  setText("past-summary", report.summary || "");
  setText(
    "past-pred-note",
    `${report.prediction?.note || "レース前AI評価"}（Ver ${PAST_RACE_REPORT_VERSION}）` +
      (report.prediction?.generatedAt
        ? ` · ${formatTs(report.prediction.generatedAt)}`
        : "")
  );

  renderResults(report.results || []);
  renderAiPicks(report.pickReviews || [], report.prediction || {});
  renderWinner(report.winnerAnalysis, report.winner);
  renderMisses(report.pickReviews || []);
}

function renderResults(rows = []) {
  const tbody = document.getElementById("past-result-body");
  if (!tbody) return;
  clearElement(tbody);
  for (const r of rows) {
    const tr = document.createElement("tr");
    if (r.finish === 1) tr.classList.add("is-winner");
    if (r.aiRole) tr.classList.add("is-ai-pick");
    const cells = [
      r.finish,
      r.number,
      r.horseName,
      r.popularity != null ? `${r.popularity}人気` : "—",
      r.aiScore != null ? String(r.aiScore) : "—",
      r.aiRole ? roleMark(r.aiRole) : "—",
      r.time || "—",
    ];
    for (const c of cells) {
      tr.appendChild(createElement("td", { text: c }));
    }
    tbody.appendChild(tr);
  }
}

function renderAiPicks(picks = [], prediction = {}) {
  const box = document.getElementById("past-ai-picks");
  if (!box) return;
  clearElement(box);

  const list = picks.length
    ? picks
    : [
        { role: "本命", number: prediction.honmei },
        { role: "対抗", number: prediction.taikou },
        { role: "穴", number: prediction.ana },
      ];

  for (const p of list) {
    if (!p.number) continue;
    const card = createElement("article", {
      className: `glass-card v55-dash-card ${p.outOfMoney ? "is-miss" : "is-hit"}`,
    });
    const title = createElement("h3", { className: "v55-dash-card__title" });
    title.textContent = `${roleMark(p.role)} ${p.role}`;
    const body = createElement("p", { className: "v65-block__text" });
    body.textContent = p.found
      ? `${p.horseName}（${p.number}番）· AI ${p.aiScore ?? "—"}点 · ${p.finish}着 · ${
          p.outOfMoney ? "馬券外" : "馬券圏内"
        }`
      : `${p.number}番 · データなし`;
    card.append(title, body);
    box.appendChild(card);
  }
}

function renderWinner(analysis, winnerRow) {
  const box = document.getElementById("past-winner");
  if (!box) return;
  clearElement(box);
  if (!analysis) {
    box.textContent = "勝因分析データがありません";
    return;
  }

  const card = createElement("article", { className: "glass-card v65-block" });
  const h = createElement("h3", { className: "v65-block__title" });
  h.textContent = `${analysis.name || winnerRow?.horseName || "勝ち馬"}（${
    analysis.number ?? winnerRow?.number ?? "—"
  }番）`;
  const p = createElement("p", { className: "v65-block__text" });
  p.textContent = analysis.explain || "";
  card.append(h, p);

  const factors = analysis.winFactors || [];
  if (factors.length) {
    const ul = createElement("ul", { className: "v55-list" });
    for (const f of factors) {
      ul.appendChild(
        createElement("li", {
          text: `${f.label}${f.why ? ` — ${f.why}` : ""}`,
        })
      );
    }
    card.appendChild(ul);
  }

  if (analysis.ability || analysis.futureExpectation) {
    const meta = createElement("p", { className: "paper-section__lead" });
    meta.textContent = [
      analysis.ability
        ? `能力評価 ${analysis.ability.score}（${analysis.ability.label}）`
        : "",
      analysis.futureExpectation
        ? `今後 ${analysis.futureExpectation.label}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ");
    card.appendChild(meta);
  }

  box.appendChild(card);
}

function renderMisses(picks = []) {
  const box = document.getElementById("past-misses");
  if (!box) return;
  clearElement(box);

  const misses = (picks || []).filter((p) => p.outOfMoney);
  if (!misses.length) {
    box.appendChild(
      createElement("p", {
        className: "v65-block__text",
        text: "本命・対抗・穴はいずれも馬券圏内でした。外れ要因の考察対象はありません。",
      })
    );
    return;
  }

  for (const m of misses) {
    const card = createElement("article", {
      className: "glass-card v65-block",
    });
    const h = createElement("h3", { className: "v65-block__title" });
    h.textContent = `${roleMark(m.role)} ${m.role}外れ · ${m.horseName}（${m.number}番 · ${m.finish}着）`;
    const p = createElement("p", { className: "v65-block__text" });
    p.textContent = m.explain || "";
    card.append(h, p);
    if (m.factors?.length) {
      const ul = createElement("ul", { className: "v55-list" });
      for (const f of m.factors) {
        ul.appendChild(createElement("li", { text: f }));
      }
      card.appendChild(ul);
    }
    box.appendChild(card);
  }
}

function roleMark(role = "") {
  const r = String(role);
  if (r.includes("本命")) return "◎";
  if (r.includes("対抗")) return "〇";
  if (r.includes("穴")) return "☆";
  return "・";
}

function formatTs(iso) {
  try {
    return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  } catch {
    return String(iso || "");
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text == null ? "" : String(text);
}
