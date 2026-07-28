/* ========================================
   PAPAPA IQ KEIBA - review.js
   Ver6.5 AI Race Review & Knowledge Learning UI
   ======================================== */

import {
  getReviewDashboard,
  resetReviewKnowledge,
  bootstrapReviewsFromHistory,
  REVIEW_VERSION,
} from "../services/review/index.js";
import { acceptReviewHandoff } from "../services/learning/index.js";
import { loadKnowledgeBase } from "../services/review/knowledge-manager.js";
import { clearElement, createElement } from "./utils.js";

export async function initReviewPage() {
  renderDashboard(getReviewDashboard({ ensureDemo: true }));

  document.getElementById("btn-refresh-review")?.addEventListener("click", () => {
    renderDashboard(getReviewDashboard({ ensureDemo: false }));
  });

  document
    .getElementById("btn-bootstrap-history")
    ?.addEventListener("click", async () => {
      const btn = document.getElementById("btn-bootstrap-history");
      if (btn) btn.disabled = true;
      try {
        await bootstrapReviewsFromHistory();
        // Learning へ最新レビューを引き渡し（ロジック非改変）
        const kb = loadKnowledgeBase();
        const latest = (kb.reviews || [])[0];
        if (latest?.learningPayload) {
          acceptReviewHandoff(latest.learningPayload);
        }
        renderDashboard(getReviewDashboard({ ensureDemo: false }));
      } catch (error) {
        console.error("[bootstrapReviewsFromHistory]", error);
      } finally {
        if (btn) btn.disabled = false;
      }
    });

  document
    .getElementById("btn-handoff-learning")
    ?.addEventListener("click", () => {
      const kb = loadKnowledgeBase();
      const latest = (kb.reviews || [])[0];
      if (!latest?.learningPayload) {
        alert("引き渡し可能な Review がありません。");
        return;
      }
      const result = acceptReviewHandoff(latest.learningPayload);
      const note = document.getElementById("review-handoff-note");
      if (note) {
        note.textContent = result.accepted
          ? "Learning へ引き渡し完了（評価ロジックは変更していません）"
          : "引き渡しに失敗しました";
      }
    });

  document
    .getElementById("btn-reset-review")
    ?.addEventListener("click", () => {
      if (!confirm("Knowledge Base（レビュー蓄積）をリセットしますか？")) return;
      renderDashboard(resetReviewKnowledge());
    });
}

function renderDashboard(dash) {
  setText("review-version", dash.version || REVIEW_VERSION);
  setText(
    "review-policy-note",
    dash.policy?.bodiesForbidden
      ? "記事・SNS本文は表示しません。AIの要約・考察のみを Knowledge Base に蓄積します。"
      : ""
  );

  const stats = dash.stats || {};
  setText("stat-kb-total", String(stats.total ?? "—"));
  setText("stat-kb-reviews", String(stats.reviewCount ?? "—"));
  setText("stat-kb-lessons", String(stats.lessonCount ?? "—"));
  setText("stat-kb-memos", String(stats.horseMemoCount ?? "—"));
  setText("stat-kb-watch", String(stats.futureWatchCount ?? "—"));

  renderLatest(dash.latestReview);
  renderExplain(dash.latestReview?.explainSections || []);
  renderList(
    "review-lessons",
    (dash.lessons || []).map((l) => `${l.text}${l.why ? ` — なぜ: ${l.why}` : ""}`)
  );
  renderWatchCards("review-next-watch", dash.nextWatch || []);
  renderWatchCards("review-danger", dash.dangerFavorites || []);
  renderWatchCards("review-rising", dash.rising || []);
  renderWatchCards("review-falling", dash.falling || []);
  renderMemos(dash.horseMemos || []);
  renderList(
    "review-history-list",
    (dash.reviewHistory || []).map(
      (r) =>
        `${formatTs(r.timestamp)} · ${r.raceId || "—"} · ${r.tone || ""} · ${r.summary || ""}`
    )
  );
  renderList(
    "review-event-history",
    (dash.history || []).map(
      (h) => `${formatTs(h.timestamp)} · ${h.type} · ${h.message}`
    )
  );
}

function renderLatest(latest) {
  const box = document.getElementById("review-latest");
  if (!box) return;
  clearElement(box);
  if (!latest) {
    box.textContent = "レビューがありません";
    return;
  }

  const blocks = [
    ["レース総括", latest.summary],
    ["展開分析", latest.development],
    ["ペース分析", latest.pace],
    ["馬場分析", latest.track],
    ["人気分析", latest.popularity],
    ["市場心理分析", latest.marketPsych],
    ["AI予想との差異", latest.predictionGap],
  ];

  for (const [title, text] of blocks) {
    if (!text) continue;
    const card = createElement("article", {
      className: "glass-card v65-block",
    });
    const h = createElement("h3", { className: "v65-block__title" });
    h.textContent = title;
    const p = createElement("p", { className: "v65-block__text" });
    p.textContent = text;
    card.append(h, p);
    box.appendChild(card);
  }

  if (latest.winner) {
    const card = createElement("article", {
      className: "glass-card v65-block",
    });
    const h = createElement("h3", { className: "v65-block__title" });
    h.textContent = `勝ち馬分析 · ${latest.winner.name}`;
    const p = createElement("p", { className: "v65-block__text" });
    p.textContent = `勝因: ${(latest.winner.factors || []).join(" / ")}`;
    const why = createElement("p", { className: "v65-block__why" });
    why.textContent = `なぜ: ${latest.winner.explain || ""}`;
    card.append(h, p, why);
    box.appendChild(card);
  }

  for (const loser of latest.losers || []) {
    const card = createElement("article", {
      className: "glass-card v65-block",
    });
    const h = createElement("h3", { className: "v65-block__title" });
    h.textContent = `敗因分析 · ${loser.name}`;
    const p = createElement("p", { className: "v65-block__text" });
    p.textContent = `敗因: ${(loser.reasons || []).join(" / ")}`;
    const why = createElement("p", { className: "v65-block__why" });
    why.textContent = `なぜ: ${loser.explain || ""}`;
    card.append(h, p, why);
    box.appendChild(card);
  }

  setText("review-latest-meta", `${latest.raceId || ""} · ${formatTs(latest.timestamp)}`);
}

function renderExplain(sections) {
  const list = document.getElementById("review-explain-list");
  if (!list) return;
  clearElement(list);
  if (!sections.length) {
    list.textContent = "Explain なし";
    return;
  }
  for (const s of sections) {
    const li = createElement("li", { className: "v65-explain-item" });
    const title = createElement("strong");
    title.textContent = s.title;
    const conc = createElement("span");
    conc.textContent = ` ${s.conclusion}`;
    const why = createElement("p", { className: "v65-block__why" });
    why.textContent = `なぜ: ${s.why || ""}`;
    li.append(title, conc, why);
    list.appendChild(li);
  }
}

function renderWatchCards(id, items) {
  const box = document.getElementById(id);
  if (!box) return;
  clearElement(box);
  if (!items.length) {
    box.textContent = "該当なし";
    return;
  }
  for (const item of items) {
    const card = createElement("article", {
      className: "glass-card v65-watch-card",
    });
    const name = createElement("p", { className: "v65-watch-card__name" });
    name.textContent = `${item.name || "—"}（スコア ${item.score ?? "—"}）`;
    const reason = createElement("p", { className: "v65-watch-card__reason" });
    reason.textContent = item.reason || "";
    const why = createElement("p", { className: "v65-block__why" });
    why.textContent = `なぜ: ${item.explain || ""}`;
    card.append(name, reason, why);
    box.appendChild(card);
  }
}

function renderMemos(memos) {
  const box = document.getElementById("review-horse-memos");
  if (!box) return;
  clearElement(box);
  if (!memos.length) {
    box.textContent = "メモなし";
    return;
  }
  for (const memo of memos) {
    const card = createElement("article", {
      className: "glass-card v65-memo-card",
    });
    const title = createElement("p", { className: "v65-memo-card__name" });
    title.textContent = memo.name || `馬${memo.horseId}`;
    const tags = createElement("p", { className: "v65-memo-card__tags" });
    tags.textContent = (memo.tags || []).join(" · ") || "—";
    const note = createElement("p", { className: "v65-memo-card__note" });
    note.textContent = memo.notes?.[0]?.text || "";
    const why = createElement("p", { className: "v65-block__why" });
    why.textContent = `なぜ: ${memo.notes?.[0]?.why || ""}`;
    card.append(title, tags, note, why);
    box.appendChild(card);
  }
}

function renderList(id, lines) {
  const list = document.getElementById(id);
  if (!list) return;
  clearElement(list);
  if (!lines.length) {
    const li = createElement("li");
    li.textContent = "データなし";
    list.appendChild(li);
    return;
  }
  for (const line of lines) {
    const li = createElement("li");
    li.textContent = line;
    list.appendChild(li);
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function formatTs(ts) {
  if (!ts) return "—";
  try {
    return String(ts).replace("T", " ").slice(0, 16);
  } catch {
    return String(ts);
  }
}
