/* ========================================
   PAPAPA IQ KEIBA - analysis.js
   Ver3.2.0 AI分析感強化（表示層のみ）
   AIロジックは ai-engine.js / thinking-engine.js を変更しない
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

const RADAR5_LABELS = ["スピード", "先行力", "瞬発力", "持久力", "安定感"];
const VENUES = ["東京", "中山", "阪神"];
const CONDITIONS = ["良", "稍重", "重", "不良"];

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
let sequenceStarted = false;

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
  runAnalysisSequence();

  document.getElementById("back-to-detail").href =
    `race-detail.html?${detailParams.toString()}`;
  document.getElementById("go-ticket").addEventListener("click", () => {
    navigateWithFade(`ticket.html?${detailParams.toString()}`);
  });

  document.getElementById("detail-close")?.addEventListener("click", () => {
    hideDetail();
  });
}

export function renderAnalysis(result, race = {}) {
  const reports = enrichMarks(
    result.horseReports || result.horses || [],
    result.horses || [],
    race,
    result.paceForecast || {}
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

  renderSimulation(reports);
  renderDeepComment(result, reports, race);
  renderUpsetSpotlight(result, reports);
  renderDangerAlerts(reports);
  renderEvList(reports);

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
  renderHorseDeepList(reports.slice(0, 8));
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

/* ---------- Ver3.2 display enrich (no AI engine changes) ---------- */

function enrichMarks(list, sourceHorses = [], race = {}, pace = {}) {
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
      defaultMarkReason(mark);

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

    const winPct = toNum(
      horse.probability?.win,
      Number(horse.winRate) || Math.max(1, aiIndex / 4)
    );
    const placePct = toNum(
      horse.probability?.place,
      clamp(winPct * 2.1, winPct, 92)
    );
    const showPct = toNum(
      horse.probability?.show,
      clamp(winPct * 1.55, winPct, 78)
    );

    const odds = Math.max(1.1, Number(source.odds || horse.odds) || 10);
    const popularity = Number(horse.popularity || source.popularity) || 99;
    const evFromOdds = Math.round((winPct / 100) * odds * 100);
    const evScore =
      horse.expectedValuePercent != null
        ? Math.round((Number(horse.expectedValuePercent) + evFromOdds) / 2)
        : evFromOdds;
    const evTone = evToneFromScore(evScore);

    const radar5 = buildRadar5(horse, source);
    const aptitude = buildAptitude(horse, source, race);
    const alerts = buildDangerAlerts(horse, source, race, pace, {
      winPct,
      popularity,
      odds,
      index,
    });

    return {
      ...source,
      ...horse,
      paperMark: mark,
      markClass: MARK_CLASS[mark] || "x",
      markReason: reason,
      aiIndex,
      expectedValuePercent,
      winPct: round1(winPct),
      placePct: round1(placePct),
      showPct: round1(showPct),
      odds,
      popularity,
      evScore,
      evTone,
      radar5,
      aptitude,
      alerts,
      risk: horse.risk || horse.riskLabel || "Medium",
      runningStyle: horse.runningStyle || source.runningStyle || "差し",
      horse: horse.horse || source.horse,
      number: horse.number != null ? horse.number : source.number,
    };
  });
}

function defaultMarkReason(mark) {
  if (mark === "◎") return "思考評価・指数ともに最上位。軸候補。";
  if (mark === "○") return "本命に続く安定感。対抗向き。";
  if (mark === "▲") return "相手関係で評価。ヒモ候補。";
  if (mark === "△") return "展開次第で食い込み可能。";
  if (mark === "☆") return "人気薄だが期待値あり。穴印。";
  return "今回は評価を抑えめ。見送り寄り。";
}

function buildRadar5(horse, source) {
  const bd = horse.breakdown || {};
  const idx = horse.indexes || source.indexes || {};
  const style = horse.runningStyle || source.runningStyle || "差し";
  const speed = clamp(
    Number(bd.speed) || indexTo100(idx.speed) || Number(horse.aiIndex) || 60,
    20,
    99
  );
  let front = Number(bd.pace) || indexTo100(idx.pace) || 55;
  if (style === "逃げ") front = clamp(front + 12, 20, 99);
  else if (style === "先行") front = clamp(front + 6, 20, 99);
  else if (style === "追込") front = clamp(front - 8, 20, 99);
  const burst = clamp(
    Number(bd.burst) || indexTo100(idx.burst) || 55,
    20,
    99
  );
  const stamina = clamp(
    Number(bd.stamina) ||
      Number(bd.durability) ||
      indexTo100(idx.stamina) ||
      55,
    20,
    99
  );
  const stability = clamp(
    indexTo100(idx.stability) || Number(horse.confidence) || 60,
    20,
    99
  );
  return [speed, front, burst, stamina, stability].map((v) => Math.round(v));
}

function buildAptitude(horse, source, race) {
  const ratings = horse.ratings || {};
  const courseBase = starsToNum(ratings.course, 3);
  const trackBase = starsToNum(ratings.track, 3);
  const last = String(source.lastRace || horse.lastRace || "");
  const venueNow = String(race.venueLabel || race.venue || "");
  const conditionNow = String(race.trackCondition || "良");
  const seed = Number(horse.number) || 1;

  const course = VENUES.map((name, i) => {
    let stars = courseBase;
    if (last.includes(name)) stars += 1;
    if (venueNow.includes(name)) stars += 1;
    stars += ((seed + i * 3) % 3) - 1;
    return { name, stars: clamp(stars, 1, 5) };
  });

  const track = CONDITIONS.map((name, i) => {
    let stars = trackBase;
    if (name === "良") stars += 1;
    if (name === conditionNow) stars += 1;
    if (name === "不良") stars -= 1;
    if ((source.trackType || horse.trackType) === "ダート" && name !== "良") {
      stars += 1;
    }
    stars += ((seed + i * 2) % 2) - 0;
    return { name, stars: clamp(stars, 1, 5) };
  });

  return { course, track };
}

function buildDangerAlerts(horse, source, race, pace, ctx) {
  const alerts = [];
  const style = horse.runningStyle || source.runningStyle || "差し";
  const minus = horse.minusFactors || [];
  const oddsLabel = horse.oddsLabel || "";
  const venue = String(race.venueLabel || "");
  const distType = source.distanceType || horse.distanceType || "";
  const raceDist = Number(race.distance) || 1600;

  if (ctx.popularity <= 3 && ctx.winPct < 18) {
    alerts.push({
      label: "人気先行",
      tone: "red",
      reason: "人気に対して推定勝率が追いついていません。",
    });
  }
  if (oddsLabel === "危険人気" || horse.role === "危険人気馬") {
    alerts.push({
      label: "人気先行",
      tone: "red",
      reason: "AI判定で危険人気に分類されています。",
    });
  }
  if (
    (distType === "短距離" && raceDist >= 1800) ||
    (distType === "長距離" && raceDist <= 1400) ||
    minus.some((m) => String(m).includes("距離"))
  ) {
    alerts.push({
      label: "距離不安",
      tone: "yellow",
      reason: "今回の距離との噛み合わせに不安があります。",
    });
  }
  if (
    (source.trackType || horse.trackType) &&
    race.track &&
    (source.trackType || horse.trackType) !== race.track
  ) {
    alerts.push({
      label: "馬場不安",
      tone: "yellow",
      reason: "芝ダ適性のズレが懸念されます。",
    });
  }
  if (
    String(pace.pace || "").includes("ハイ") &&
    (style === "逃げ" || style === "先行")
  ) {
    alerts.push({
      label: "展開不利",
      tone: "blue",
      reason: "ハイペース想定で先行負担が増えやすい形です。",
    });
  }
  if (
    String(pace.pace || "").includes("スロー") &&
    (style === "差し" || style === "追込")
  ) {
    alerts.push({
      label: "展開不利",
      tone: "blue",
      reason: "スロー想定では後方待機が届きにくい展開です。",
    });
  }
  if ((Number(source.frame) || 0) >= 7 && style === "逃げ") {
    alerts.push({
      label: "スタート不安",
      tone: "yellow",
      reason: "外枠逃げはハナ争いでロスが出やすい配置です。",
    });
  }
  if (venue.includes("中山") || venue.includes("小倉")) {
    if (seedBit(horse.number, 1) && style === "差し") {
      alerts.push({
        label: "右回り苦手",
        tone: "blue",
        reason: "右回りコースでの脚の出し方にばらつきがあります。",
      });
    }
  }
  if (venue.includes("京都") || venue.includes("阪神")) {
    if (seedBit(horse.number, 2) && style === "追込") {
      alerts.push({
        label: "左回り苦手",
        tone: "blue",
        reason: "左回りでの直線の加速にムラが見えます。",
      });
    }
  }
  if (
    (Number(horse.indexes?.stability) || 500) < 460 ||
    minus.some((m) => String(m).includes("折り合い"))
  ) {
    alerts.push({
      label: "折り合い課題",
      tone: "yellow",
      reason: "気性面・折り合いの課題が残りやすいタイプです。",
    });
  }

  const uniq = [];
  const seen = new Set();
  alerts.forEach((a) => {
    if (seen.has(a.label)) return;
    seen.add(a.label);
    uniq.push(a);
  });
  return uniq.slice(0, 4);
}

function seedBit(num, bit) {
  return ((Number(num) || 0) + bit) % 3 === 0;
}

function evToneFromScore(score) {
  if (score >= 100) return "buy";
  if (score >= 75) return "watch";
  return "skip";
}

function evLabel(tone) {
  if (tone === "buy") return "買い";
  if (tone === "watch") return "様子見";
  return "見送り";
}

/* ---------- Section renderers ---------- */

function renderSimulation(reports) {
  const top = reports[0];
  if (!top) return;

  setText(
    "sim-focus-horse",
    `${top.paperMark} ${top.number}番 ${top.horse}`
  );
  setText(
    "sim-lead",
    `${top.horse}を基準に、AI評価値から1000回レースを想定した分布です`
  );

  animateCount(document.getElementById("sim-win"), top.winPct, "", 1100, true);
  animateCount(document.getElementById("sim-place"), top.placePct, "", 1200, true);
  animateCount(document.getElementById("sim-show"), top.showPct, "", 1300, true);
  animateCount(document.getElementById("sim-ev"), top.evScore, "", 1400, false);

  setBar("sim-win-bar", top.winPct);
  setBar("sim-place-bar", top.placePct);
  setBar("sim-show-bar", top.showPct);
  setBar("sim-ev-bar", clamp(top.evScore / 2, 0, 100));

  const rows = document.getElementById("sim-rows");
  if (!rows) return;
  clearElement(rows);
  const maxWin = Math.max(...reports.slice(0, 6).map((h) => h.winPct), 1);
  reports.slice(0, 6).forEach((horse) => {
    const fill = createElement("span", { className: "sim-row__fill" });
    rows.appendChild(
      createElement("div", {
        className: "sim-row",
        children: [
          createElement("span", {
            className: `sim-row__mark mark--${horse.markClass}`,
            text: horse.paperMark,
          }),
          createElement("div", {
            children: [
              createElement("p", {
                className: "sim-row__name",
                text: `${horse.number}番 ${horse.horse}`,
              }),
              createElement("div", {
                className: "sim-row__track",
                children: [fill],
              }),
            ],
          }),
          createElement("span", {
            className: "sim-row__pct",
            text: `${horse.winPct.toFixed(1)}%`,
          }),
        ],
      })
    );
    requestAnimationFrame(() => {
      fill.style.width = `${clamp((horse.winPct / maxWin) * 100, 6, 100)}%`;
    });
  });
}

function renderDeepComment(result, reports, race) {
  const root = document.getElementById("deep-ai-comment");
  if (!root) return;
  clearElement(root);
  const blocks = buildDeepAiComment(result, reports, race);
  blocks.forEach((block) => {
    root.appendChild(
      createElement("div", {
        className: "deep-comment__block",
        children: [
          createElement("h3", { text: block.title }),
          createElement("p", { text: block.text }),
        ],
      })
    );
  });
}

function buildDeepAiComment(result, reports, race) {
  const pace = result.paceForecast || {};
  const top = reports[0] || {};
  const second = reports[1] || {};
  const closer = reports.find(
    (h) => h.runningStyle === "差し" || h.runningStyle === "追込"
  );
  const nige = reports.find((h) => h.runningStyle === "逃げ");
  const venue = race.venueLabel || race.venue || "開催場";
  const dist = race.distance ? `${race.distance}m` : "今回距離";
  const condition = race.trackCondition || "良";
  const paceLabel = pace.pace || "平均";
  const adv = pace.advantage || "先行有利";
  const plus = (top.plusFactors || []).slice(0, 2).join("、") || "指数上位の安定感";
  const minus =
    (top.minusFactors || []).slice(0, 2).join("、") ||
    (top.alerts?.[0]?.label || "大きな減点は限定的");

  return [
    {
      title: "展開予想",
      text: `${venue}${dist}は${condition}馬場想定。脚質構成は逃げ${pace.nige || 0}・先行${pace.senkou || 0}・差し${pace.sashi || 0}・追込${pace.oikomi || 0}。全体として${adv}の形になりやすく、${top.horse || "上位馬"}を軸に相手を絞るのが基本線です。`,
    },
    {
      title: "ペース予想",
      text: `テンの質は${paceLabel}ペースを想定。${
        String(paceLabel).includes("ハイ")
          ? "先行勢に負荷がかかり、後方待機の末脚が相対的に生きやすい流れです。"
          : String(paceLabel).includes("スロー")
            ? "前が楽になる可能性が高く、押し切り・粘り込みが決まりやすい展開です。"
            : "極端な偏りは出にくい平均寄り。位置取りの巧拙が着順差に直結します。"
      }`,
    },
    {
      title: "位置取り",
      text: nige
        ? `${nige.number}番${nige.horse}がハナを主張しやすく、${second.horse || "対抗馬"}は好位〜中団で脚を溜める構図。${top.runningStyle || "差し"}の${top.horse || "本命"}は${
            top.runningStyle === "逃げ" || top.runningStyle === "先行"
              ? "先団で競馬を進める形が理想"
              : "コーナー手前で外へ出しやすい位置を確保したい"
          }。`
        : `逃げ不在気味でペースが落ち着く可能性。各馬が内目の好位を奪い合う展開になりそうです。`,
    },
    {
      title: "仕掛けタイミング",
      text: `${
        String(paceLabel).includes("ハイ")
          ? "3〜4角でじわっと押し上げ、直線入口での加速勝負がポイント。"
          : "残り600〜400m付近の仕掛けが勝負。早仕掛けは禁物で、反応の良さを残した一発が有効。"
      }${closer ? ` ${closer.number}番の末脚が直線でどこまで伸びるかが鍵です。` : ""}`,
    },
    {
      title: "勝負所",
      text: `勝負所は${venue.includes("東京") ? "直線の長い坂区間" : venue.includes("中山") ? "急坂と小回りコーナー" : "直線の伸びとコーナーワーク"}。${top.paperMark || "◎"}${top.number || ""}番を軸に、${second.number || "相手"}番との力関係を見極めたい一戦です。`,
    },
    {
      title: "期待材料",
      text: `${top.horse || "本命"}は${plus}が光る内容。AIシミュレーションでも勝率${top.winPct || 0}%・EV${top.evScore || 0}%と上位。相手薄なら連対まで視野に入ります。`,
    },
    {
      title: "不安材料",
      text: `一方で${minus}は割り引き材料。危険側は${result.dangerHorse?.horse || "人気先行馬"}、穴側は${result.upsetHorse?.horse || "期待値上位の人気薄"}を意識し、買い目は本命偏重を避けたバランス配分が無難です。`,
    },
  ];
}

function renderUpsetSpotlight(result, reports) {
  const root = document.getElementById("upset-spotlight");
  if (!root) return;
  clearElement(root);

  const byEv = [...reports]
    .filter((h) => Number(h.popularity) >= 5)
    .sort((a, b) => b.evScore - a.evScore || b.winPct - a.winPct);

  const named = result.upsetHorse?.horse
    ? reports.find((h) => h.horse === result.upsetHorse.horse)
    : null;

  const picks = [];
  if (named) picks.push(named);
  byEv.forEach((h) => {
    if (picks.length >= 2) return;
    if (picks.some((p) => p.number === h.number)) return;
    picks.push(h);
  });

  if (!picks.length) {
    root.appendChild(
      createElement("p", {
        className: "paper-section__lead",
        text: "条件を満たす注目穴馬は検出されませんでした。",
      })
    );
    return;
  }

  picks.forEach((horse) => {
    const reason =
      horse.roleComment ||
      result.upsetHorse?.reason ||
      `人気${horse.popularity}番手ながらEV${horse.evScore}%・勝率${horse.winPct}%と妙味。`;
    root.appendChild(
      createElement("article", {
        className: "upset-card glass-card",
        children: [
          createElement("p", {
            className: "upset-card__tag",
            text: "AI注目穴馬",
          }),
          createElement("h3", {
            className: "upset-card__horse",
            text: `${horse.paperMark} ${horse.number}番 ${horse.horse}`,
          }),
          createElement("p", {
            className: "upset-card__meta",
            text: `${horse.popularity}番人気 ／ オッズ ${horse.odds}倍 ／ EV ${horse.evScore}%`,
          }),
          createElement("p", {
            className: "upset-card__reason",
            text: reason,
          }),
        ],
      })
    );
  });
}

function renderDangerAlerts(reports) {
  const root = document.getElementById("danger-alert-list");
  if (!root) return;
  clearElement(root);

  const targets = reports
    .filter((h) => (h.alerts || []).length)
    .sort((a, b) => b.alerts.length - a.alerts.length)
    .slice(0, 6);

  if (!targets.length) {
    root.appendChild(
      createElement("p", {
        className: "paper-section__lead",
        text: "重大な危険アラートは検出されませんでした。",
      })
    );
    return;
  }

  targets.forEach((horse) => {
    const badges = createElement("div", { className: "alert-badges" });
    horse.alerts.forEach((alert) => {
      badges.appendChild(
        createElement("span", {
          className: `alert-badge alert-badge--${alert.tone}`,
          text: alert.label,
        })
      );
    });
    root.appendChild(
      createElement("article", {
        className: "danger-alert-card",
        children: [
          createElement("h3", {
            className: "danger-alert-card__horse",
            text: `${horse.paperMark} ${horse.number}番 ${horse.horse}`,
          }),
          badges,
          createElement("p", {
            className: "danger-alert-card__reason",
            text: horse.alerts.map((a) => a.reason).join(" "),
          }),
        ],
      })
    );
  });
}

function renderEvList(reports) {
  const root = document.getElementById("ev-list");
  if (!root) return;
  clearElement(root);
  const sorted = [...reports].sort((a, b) => b.evScore - a.evScore);
  const maxEv = Math.max(...sorted.map((h) => h.evScore), 1);

  sorted.slice(0, 10).forEach((horse) => {
    const fill = createElement("span", { className: "ev-row__fill" });
    root.appendChild(
      createElement("article", {
        className: `ev-row ev-row--${horse.evTone}`,
        children: [
          createElement("div", {
            className: "ev-row__top",
            children: [
              createElement("p", {
                className: "ev-row__name",
                text: `${horse.paperMark} ${horse.number}番 ${horse.horse}`,
              }),
              createElement("span", {
                className: "ev-row__value",
                text: `${horse.evScore}%`,
              }),
            ],
          }),
          createElement("p", {
            className: "ev-row__label",
            text: `${evLabel(horse.evTone)} ／ 勝率${horse.winPct}% × オッズ${horse.odds}`,
          }),
          createElement("div", {
            className: "ev-row__track",
            children: [fill],
          }),
        ],
      })
    );
    requestAnimationFrame(() => {
      fill.style.width = `${clamp((horse.evScore / maxEv) * 100, 8, 100)}%`;
    });
  });
}

function renderHorseDeepList(reports) {
  const root = document.getElementById("horse-deep-list");
  if (!root) return;
  clearElement(root);

  reports.forEach((horse, index) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 200 200");
    svg.setAttribute("class", "mini-radar-svg");
    svg.setAttribute("aria-label", `${horse.horse}能力レーダー`);
    drawSvgRadar(svg, horse.radar5, false);

    const aptitude = createElement("div", { className: "aptitude-block" });
    aptitude.appendChild(buildAptitudeGroup("コース適性", horse.aptitude.course));
    aptitude.appendChild(buildAptitudeGroup("馬場適性", horse.aptitude.track));

    const badges = createElement("div", { className: "alert-badges" });
    (horse.alerts || []).forEach((alert) => {
      badges.appendChild(
        createElement("span", {
          className: `alert-badge alert-badge--${alert.tone}`,
          text: alert.label,
        })
      );
    });

    const card = createElement("article", {
      className: "horse-deep glass-card",
      children: [
        createElement("div", {
          className: "horse-deep__head",
          children: [
            createElement("div", {
              children: [
                createElement("h3", {
                  className: "horse-deep__title",
                  text: `${horse.paperMark} ${horse.number}番 ${horse.horse}`,
                }),
                createElement("p", {
                  className: "horse-deep__sub",
                  text: `AI指数 ${horse.aiIndex} ／ EV ${horse.evScore}% ／ ${horse.runningStyle}`,
                }),
              ],
            }),
          ],
        }),
        createElement("div", {
          className: "horse-deep__body",
          children: [svg, aptitude],
        }),
        badges,
      ],
    });
    root.appendChild(card);

    window.setTimeout(() => {
      svg.classList.add("is-drawn");
      animateAptitudeStars(card);
    }, 180 + index * 90);
  });
}

function buildAptitudeGroup(title, rows) {
  const wrap = createElement("div", { className: "aptitude-group" });
  wrap.appendChild(
    createElement("p", { className: "aptitude-group__title", text: title })
  );
  rows.forEach((row) => {
    const stars = createElement("div", {
      className: "aptitude-stars",
      attrs: { "data-stars": String(row.stars) },
    });
    for (let i = 1; i <= 5; i += 1) {
      const span = createElement("span", { text: "★" });
      if (i <= row.stars) span.classList.add("is-on");
      stars.appendChild(span);
    }
    wrap.appendChild(
      createElement("div", {
        className: "aptitude-row",
        children: [
          createElement("span", {
            className: "aptitude-row__name",
            text: row.name,
          }),
          stars,
        ],
      })
    );
  });
  return wrap;
}

function animateAptitudeStars(root) {
  root.querySelectorAll(".aptitude-stars").forEach((el, idx) => {
    window.setTimeout(() => el.classList.add("is-animated"), idx * 60);
  });
}

function drawSvgRadar(svg, values, animateImmediate) {
  clearElement(svg);
  const cx = 100;
  const cy = 100;
  const radius = 62;
  const n = RADAR5_LABELS.length;
  const step = (Math.PI * 2) / n;
  const start = -Math.PI / 2;

  for (let level = 4; level >= 1; level -= 1) {
    const pts = [];
    for (let i = 0; i < n; i += 1) {
      const a = start + step * i;
      const r = (radius / 4) * level;
      pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
    }
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", pts.join(" "));
    poly.setAttribute("class", "radar-grid");
    svg.appendChild(poly);
  }

  for (let i = 0; i < n; i += 1) {
    const a = start + step * i;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(cx));
    line.setAttribute("y1", String(cy));
    line.setAttribute("x2", String(cx + Math.cos(a) * radius));
    line.setAttribute("y2", String(cy + Math.sin(a) * radius));
    line.setAttribute("class", "radar-axis");
    svg.appendChild(line);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(cx + Math.cos(a) * (radius + 16)));
    text.setAttribute("y", String(cy + Math.sin(a) * (radius + 16) + 3));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "radar-label");
    text.textContent = RADAR5_LABELS[i];
    svg.appendChild(text);
  }

  const valuePts = values.map((v, i) => {
    const a = start + step * i;
    const r = radius * (clamp(v, 0, 100) / 100);
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  });
  const valuePoly = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polygon"
  );
  valuePoly.setAttribute("points", valuePts.join(" "));
  valuePoly.setAttribute("class", "radar-poly");
  svg.appendChild(valuePoly);

  if (animateImmediate) {
    requestAnimationFrame(() => svg.classList.add("is-drawn"));
  }
}

/* ---------- Existing Ver3.1 renderers (kept) ---------- */

function markClassName(mark) {
  return MARK_CLASS[mark] || "x";
}

function gradeToGauge(grade) {
  const map = { S: 96, A: 84, B: 70, C: 55, D: 38, E: 22 };
  const key = String(grade || "").toUpperCase();
  return map[key] != null ? map[key] : 50;
}

function animateConfidenceRing(value) {
  const ring = document.getElementById("confidence-ring");
  const arc = document.getElementById("confidence-ring-value");
  if (!arc) return;
  const pct = clamp(value, 0, 100);
  arc.style.strokeDasharray = String(CONF_RING_CIRC);
  arc.style.strokeDashoffset = String(CONF_RING_CIRC);
  requestAnimationFrame(() => {
    arc.style.strokeDashoffset = String(CONF_RING_CIRC * (1 - pct / 100));
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
      { text: pace.advantage || "先行有利", cls: "pace-badge--adv" },
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
  const sorted = [...reports].sort((a, b) => (b.winPct || 0) - (a.winPct || 0));
  const max = Math.max(...sorted.map((h) => h.winPct || 0), 1);
  sorted.slice(0, 10).forEach((horse, index) => {
    const fill = createElement("span", { className: "win-rank__fill" });
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
          createElement("div", {
            className: "win-rank__body",
            children: [
              createElement("p", {
                className: "win-rank__name",
                text: `${horse.number}番 ${horse.horse}`,
              }),
              createElement("div", {
                className: "win-rank__track",
                children: [fill],
              }),
            ],
          }),
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

function setBar(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  requestAnimationFrame(() => {
    el.style.width = `${clamp(value, 0, 100)}%`;
  });
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
    if (markCell) markCell.className = `td-mark mark--${horse.markClass}`;
    tr.addEventListener("click", () => {
      body.querySelectorAll("tr").forEach((row) => row.classList.remove("is-active"));
      tr.classList.add("is-active");
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
              text: `${horse.runningStyle} ／ ${horse.popularity}人気 ／ EV ${horse.evScore}%`,
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
              text: evLabel(horse.evTone),
            }),
          ],
        }),
      ],
    });
    card.addEventListener("click", () => {
      root.querySelectorAll(".index-card").forEach((el) => el.classList.remove("is-active"));
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
  setText("detail-title", `${horse.paperMark} ${horse.number}番 ${horse.horse}`);

  const radar = document.getElementById("detail-radar");
  if (radar) {
    radar.classList.remove("is-drawn");
    drawSvgRadar(radar, horse.radar5 || [60, 60, 60, 60, 60], true);
  }

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

  const aptitudeRoot = document.getElementById("detail-aptitude");
  if (aptitudeRoot) {
    clearElement(aptitudeRoot);
    if (horse.aptitude) {
      aptitudeRoot.appendChild(
        buildAptitudeGroup("コース適性", horse.aptitude.course)
      );
      aptitudeRoot.appendChild(
        buildAptitudeGroup("馬場適性", horse.aptitude.track)
      );
      requestAnimationFrame(() => animateAptitudeStars(aptitudeRoot));
    }
  }

  const alertRoot = document.getElementById("detail-alerts");
  if (alertRoot) {
    clearElement(alertRoot);
    (horse.alerts || []).forEach((alert) => {
      alertRoot.appendChild(
        createElement("span", {
          className: `alert-badge alert-badge--${alert.tone}`,
          text: alert.label,
        })
      );
    });
  }

  appendLines(
    document.getElementById("detail-text"),
    [
      ...(horse.comments || []),
      "",
      horse.markReason || "",
      `推定勝率 ${horse.winPct}% / 連対 ${horse.placePct}% / 複勝 ${horse.showPct}%`,
      `EV ${horse.evScore}%（${evLabel(horse.evTone)}）`,
      ...(horse.alerts || []).map((a) => `${a.label}: ${a.reason}`),
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
    const count = counts[label] != null ? counts[label] : horses.length;
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
    const mark = createElement("span", {
      className: `ticket-bet-card__mark mark--${markClassName(bet.mark)}`,
      text: bet.mark,
    });
    const combo = createElement("span", {
      className: "ticket-bet-card__combo",
      text: bet.combo,
    });
    list.appendChild(
      createElement("article", {
        className: "ticket-bet-card",
        children: [
          createElement("div", {
            className: "ticket-bet-card__main",
            children: [mark, combo],
          }),
          createElement("div", {
            className: "ticket-bet-card__meta",
            children: [
              createElement("span", {
                className: "ticket-bet-card__confidence",
                text: `AI信頼度 ${bet.confidence}%`,
              }),
            ],
          }),
        ],
      })
    );
  });

  const note = document.getElementById("paper-ticket-note");
  if (note) note.textContent = (data.comment || []).filter(Boolean).join(" ");
}

/* ---------- Charts / canvas ---------- */

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

/* ---------- Animation sequence ---------- */

function runAnalysisSequence() {
  if (sequenceStarted) return;
  sequenceStarted = true;
  const overlay = document.getElementById("ai-scan-overlay");
  const nodes = Array.from(document.querySelectorAll(".page--v32 .reveal"));

  nodes.forEach((n) => n.classList.remove("is-visible"));
  overlay?.classList.add("is-active");

  window.setTimeout(() => {
    overlay?.classList.remove("is-active");
    nodes.forEach((node, index) => {
      window.setTimeout(() => {
        node.classList.add("is-visible");
        node.querySelectorAll(".mini-radar-svg").forEach((svg) => {
          svg.classList.add("is-drawn");
        });
        animateAptitudeStars(node);
      }, index * 120);
    });
  }, 900);
}

function animateCount(el, target, suffix = "", duration = 800, asFloat = false) {
  if (!el) return;
  const from = performance.now();
  const goal = Number(target) || 0;
  const tick = (now) => {
    const t = Math.min(1, (now - from) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = goal * eased;
    el.textContent = asFloat
      ? `${value.toFixed(1)}${suffix}`
      : `${Math.round(value)}${suffix}`;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- Helpers ---------- */

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, Number(v) || 0));
}

function round1(v) {
  return Math.round(Number(v) * 10) / 10;
}

function toNum(value, fallback) {
  return value != null && value !== "" ? Number(value) : fallback;
}

function indexTo100(index) {
  if (index == null) return 0;
  return clamp(Number(index) / 10, 0, 99);
}

function starsToNum(stars, fallback) {
  if (typeof stars === "number") return stars;
  if (typeof stars === "string") {
    const count = (stars.match(/★/g) || []).length;
    if (count) return count;
  }
  return fallback;
}
