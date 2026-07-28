/* ========================================
   PAPAPA IQ KEIBA - race.js
   トップ / レース一覧 / レース詳細
   Ver7.1 Race Calendar Intelligence
   ======================================== */

import { DEBUG, DEBUG_MODE, DEFAULT_RACE, MAX_HORSE, PREFETCH_DEDUP_TTL_MS } from "./config.js";
import {
  getCalendarDashboard,
  getCalendarMode,
  setCalendarMode,
  buildMonthCells,
  getVenuesOnDate,
  getSessionInfo,
  validateDateSelection,
  validateVenueSelection,
} from "../services/calendar/index.js";
import { connectRaceData } from "../services/race-connect/index.js";
import { listRealRacesFor } from "../services/provider/race/index.js";
import { loadEntriesForAi } from "../services/entry/index.js";
import { loadDrawForAi } from "../services/draw/index.js";
import { loadOddsForAi } from "../services/odds/index.js";
import { loadWeatherForAi } from "../services/weather/index.js";
import { loadNewsForAi } from "../services/news/index.js";
import { loadSocialForAi } from "../services/social/index.js";
import { shouldPrefetch } from "../services/runtime/prefetch-deduper.js";
import {
  applyCardStagger,
  clearElement,
  createAiGrade,
  createButton,
  createCard,
  createElement,
  createOption,
  formatStars,
  getSearchParams,
  loadJson,
  navigateWithFade,
  renderTableBody,
} from "./utils.js";

/** トップ画面 */
export async function initTopPage(goRaceListButton) {
  const raceDateInput = document.getElementById("race-date");
  const raceVenueSelect = document.getElementById("race-venue");
  const sessionBox = document.getElementById("session-info");
  const errorEl = document.getElementById("cal-error");

  // Ver7.5/Ver10.0: 開催情報を Calendar へ反映（通知なし）
  // Real モードは RealRaceProvider。Mock 時のみ Race Connect を補助同期
  if (getCalendarMode() !== "real") {
    await connectRaceData({ emitUpdate: false, silent: true });
  }
  let cal = await getCalendarDashboard();
  let viewYear = 2026;
  let viewMonth = 7;
  if (cal.range?.min) {
    const [y, m] = cal.range.min.split("-").map(Number);
    viewYear = y;
    viewMonth = m;
  }

  bindCalendarDevPanel(() => location.reload());
  bindRealRaceStatus(cal);

  if (cal.blocked || !cal.ok) {
    showCalError(
      errorEl,
      cal.userMessage ||
        cal.message ||
        (getCalendarMode() === "real"
          ? "現在データを取得できません"
          : "カレンダーを読み込めません")
    );
  }

  const meetingSet = cal.meetingDateSet || new Set();

  function prefetchIntel(date, venueId) {
    const key = `intel:${date || ""}:${venueId || ""}`;
    if (!shouldPrefetch(key, PREFETCH_DEDUP_TTL_MS)) return;
    const opts = {
      date,
      venueId: venueId || undefined,
      emitUpdate: false,
      silent: true,
    };
    void loadEntriesForAi(opts);
    void loadDrawForAi(opts);
    void loadOddsForAi(opts);
    void loadWeatherForAi(opts);
    void loadNewsForAi(opts);
    void loadSocialForAi(opts);
  }

  function renderCalendar() {
    const label = document.getElementById("cal-month-label");
    if (label) label.textContent = `${viewYear}年${viewMonth}月`;
    const grid = document.getElementById("cal-grid");
    if (!grid) return;
    clearElement(grid);
    const cells = buildMonthCells(viewYear, viewMonth, meetingSet);
    const selected = raceDateInput.value;
    for (const cell of cells) {
      if (cell.type === "pad") {
        const pad = createElement("span", { className: "v71-cal__pad" });
        grid.appendChild(pad);
        continue;
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "v71-cal__day";
      btn.textContent = String(cell.day);
      btn.dataset.date = cell.date;
      if (!cell.selectable) {
        btn.classList.add("is-disabled");
        btn.disabled = true;
        btn.title = "非開催日";
      } else {
        btn.classList.add("is-meeting");
        btn.title = "開催日";
      }
      if (cell.date === selected) btn.classList.add("is-selected");
      btn.addEventListener("click", () => {
        if (!cell.selectable) return;
        raceDateInput.value = cell.date;
        renderCalendar();
        populateVenues(cell.date);
        // Ver9.0: 同一日付の重複プリフェッチを抑制
        prefetchIntel(cell.date, raceVenueSelect.value || undefined);
      });
      grid.appendChild(btn);
    }
  }

  function populateVenues(date) {
    clearElement(raceVenueSelect);
    raceVenueSelect.appendChild(createOption("", "開催場を選択"));
    const venues = getVenuesOnDate(cal.meetings || [], date);
    if (!venues.length) {
      raceVenueSelect.appendChild(createOption("", "開催場なし"));
      hideSession(sessionBox);
      return;
    }
    venues.forEach((v) => {
      raceVenueSelect.appendChild(createOption(v.venueId, v.label));
    });
    hideSession(sessionBox);
  }

  function refreshSession() {
    const date = raceDateInput.value;
    const venueId = raceVenueSelect.value;
    if (!date || !venueId) {
      hideSession(sessionBox);
      return;
    }
    const session = getSessionInfo(cal.meetings || [], date, venueId);
    if (!session || !sessionBox) {
      hideSession(sessionBox);
      return;
    }
    sessionBox.hidden = false;
    setText("session-kai", session.kaiLabel);
    setText("session-day", session.dayLabel);
    setText(
      "session-final",
      session.venue.isFinalDay ? "開催最終日" : "—"
    );
    setText("session-division", session.divisionLabel);
    setText("session-status", session.statusLabel);
    setText(
      "session-stage",
      `Stage${session.analysisStage.stage} ${session.analysisStage.short}`
    );
  }

  document.getElementById("cal-prev")?.addEventListener("click", () => {
    viewMonth -= 1;
    if (viewMonth < 1) {
      viewMonth = 12;
      viewYear -= 1;
    }
    renderCalendar();
  });
  document.getElementById("cal-next")?.addEventListener("click", () => {
    viewMonth += 1;
    if (viewMonth > 12) {
      viewMonth = 1;
      viewYear += 1;
    }
    renderCalendar();
  });

  raceVenueSelect.addEventListener("change", () => {
    refreshSession();
    const date = raceDateInput.value;
    const venueId = raceVenueSelect.value;
    if (date && venueId) {
      prefetchIntel(date, venueId);
    }
  });

  // 初期: 直近の開催日を選択
  const defaultDate =
    [...meetingSet].find((d) => d >= "2026-07-27") ||
    [...meetingSet][0] ||
    "";
  if (defaultDate && cal.ok) {
    raceDateInput.value = defaultDate;
    const [y, m] = defaultDate.split("-").map(Number);
    viewYear = y;
    viewMonth = m;
    populateVenues(defaultDate);
    prefetchIntel(defaultDate, raceVenueSelect.value || undefined);
  }

  renderCalendar();

  goRaceListButton.addEventListener("click", () => {
    const raceDate = raceDateInput.value;
    const raceVenue = raceVenueSelect.value;
    const dateCheck = validateDateSelection(cal.meetings || [], raceDate);
    if (!dateCheck.ok) {
      showCalError(errorEl, dateCheck.message);
      return;
    }
    const venueCheck = validateVenueSelection(
      cal.meetings || [],
      raceDate,
      raceVenue
    );
    if (!venueCheck.ok) {
      showCalError(errorEl, venueCheck.message);
      return;
    }
    hideCalError(errorEl);

    const raceVenueLabel =
      raceVenueSelect.options[raceVenueSelect.selectedIndex]?.text || "";
    const session = getSessionInfo(cal.meetings || [], raceDate, raceVenue);

    const params = new URLSearchParams({
      date: raceDate,
      venue: raceVenue,
      venueLabel: raceVenue ? raceVenueLabel : "",
      kai: String(session?.venue?.kai || ""),
      day: String(session?.venue?.day || ""),
      stage: String(session?.analysisStage?.stage ?? ""),
    });

    navigateWithFade(`race-list.html?${params.toString()}`);
  });
}

function bindCalendarDevPanel(onChange) {
  const panel = document.getElementById("cal-dev-panel");
  if (!panel) return;
  const enabled = Boolean(DEBUG || DEBUG_MODE);
  panel.hidden = !enabled;
  panel.classList.toggle("is-visible", enabled);
  if (!enabled) return;

  const mode = getCalendarMode();
  const note = document.getElementById("cal-mode-note");
  if (note) {
    note.textContent =
      mode === "real"
        ? "Real Race Calendar（失敗時は Mock へ自動切替しません）"
        : "Mock Calendar を使用中";
  }
  document.querySelectorAll("[data-cal-mode]").forEach((btn) => {
    btn.classList.toggle(
      "is-active",
      btn.getAttribute("data-cal-mode") === mode
    );
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      setCalendarMode(btn.getAttribute("data-cal-mode"));
      onChange?.();
    });
  });
}

function bindRealRaceStatus(cal) {
  setText(
    "cal-provider-kind",
    cal?.providerKind === "real" || cal?.mode === "real" ? "Real" : "Mock"
  );
  setText(
    "cal-meeting-count",
    String(cal?.meetings?.length || cal?.meetingDates?.length || 0)
  );
  setText(
    "cal-race-count",
    String(cal?.races?.length || 0)
  );
  setText(
    "cal-updated",
    cal?.updatedAt ? String(cal.updatedAt).replace("T", " ").slice(0, 19) : "—"
  );
  setText(
    "cal-sync-status",
    !cal?.ok
      ? "失敗"
      : cal?.skipped
        ? "変更なし"
        : cal?.ok
          ? "同期済"
          : "—"
  );
  setText(
    "dev-real-provider",
    cal?.providerId || (cal?.mode === "real" ? "real-race" : "mock")
  );
  setText(
    "dev-real-count",
    `meetings ${cal?.meetings?.length || 0} / races ${cal?.races?.length || 0}`
  );
  setText(
    "dev-real-validation",
    cal?.validation?.ok
      ? `OK (warn ${cal.validation.warnings?.length || 0})`
      : `NG ${cal?.validation?.errors?.length || 0}`
  );
  setText(
    "dev-real-sync",
    cal?.skipped ? "skipped(unchanged)" : cal?.ok ? "synced" : "—"
  );
  setText(
    "dev-real-updated",
    cal?.updatedAt ? String(cal.updatedAt).replace("T", " ").slice(0, 19) : "—"
  );
}

function hideSession(box) {
  if (box) box.hidden = true;
}

function showCalError(el, message) {
  if (!el) {
    alert(message);
    return;
  }
  el.hidden = false;
  el.textContent = message;
}

function hideCalError(el) {
  if (!el) return;
  el.hidden = true;
  el.textContent = "";
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/** レース一覧描画 */
export function renderRace(container, races, context) {
  clearElement(container);

  if (!races.length) {
    container.appendChild(
      createElement("p", {
        className: "v71-empty",
        text: "この開催日・開催場のレースデータがありません",
      })
    );
    return;
  }

  races.forEach((race) => {
    const numberEl = createElement("span", {
      className: "race-card__number",
      text: `${race.number}R`,
    });

    const title = createElement("h2", { className: "race-card__title" });
    title.appendChild(numberEl);
    title.appendChild(document.createTextNode(` ${race.name}`));

    const header = createElement("div", {
      className: "race-card__header",
      children: [title, createAiGrade(race.grade)],
    });

    const time = createElement("p", {
      className: "race-card__time",
      text: `発走時刻 ${race.time}`,
    });

    const stageHint = createElement("p", {
      className: "race-card__stage",
      text: context.stageLabel
        ? `分析段階 ${context.stageLabel}`
        : "",
    });

    const detailBtn = createButton({
      text: "詳細を見る",
      className: "btn-card",
      dataset: {
        race: race.number,
        name: race.name,
        time: race.time,
        grade: race.grade,
      },
    });

    container.appendChild(
      createCard("race-card", [header, time, stageHint, detailBtn])
    );
  });

  applyCardStagger();

  container.onclick = (event) => {
    const button = event.target.closest(".btn-card");
    if (!button) return;

    const detailParams = new URLSearchParams({
      date: context.raceDate,
      venue: context.raceVenue,
      venueLabel: context.venueLabel,
      race: button.dataset.race || String(DEFAULT_RACE),
      name: button.dataset.name || "",
      time: button.dataset.time || "",
      grade: button.dataset.grade || "",
      stage: context.stage != null ? String(context.stage) : "",
    });

    navigateWithFade(`race-detail.html?${detailParams.toString()}`);
  };
}

/** レース一覧画面 */
export async function initRaceListPage() {
  const params = getSearchParams();
  const raceDate = params.get("date") || "";
  const raceVenue = params.get("venue") || "";
  const venueLabel = params.get("venueLabel") || "";
  const mode = getCalendarMode();

  document.getElementById("display-date").textContent = raceDate || "未選択";
  document.getElementById("display-venue").textContent = venueLabel || "未選択";

  if (mode !== "real") {
    await connectRaceData({ emitUpdate: false, silent: true });
  }
  const cal = await getCalendarDashboard({ mode });
  const session = getSessionInfo(cal.meetings || [], raceDate, raceVenue);

  const sessionMeta = document.getElementById("list-session-meta");
  if (sessionMeta && session) {
    sessionMeta.hidden = false;
    sessionMeta.textContent = [
      session.kaiLabel,
      session.dayLabel,
      session.venue.isFinalDay ? "開催最終日" : null,
      session.divisionLabel,
      session.statusLabel,
      `Stage${session.analysisStage.stage} ${session.analysisStage.short}`,
      mode === "real" ? "Provider: Real" : "Provider: Mock",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  let filtered = [];
  if (mode === "real") {
    if (!cal.ok) {
      const listError = document.getElementById("list-error");
      if (listError) {
        listError.hidden = false;
        listError.textContent =
          cal.userMessage || "現在データを取得できません";
      }
      filtered = [];
    } else {
      filtered = listRealRacesFor(raceDate, raceVenue);
      if (!filtered.length && Array.isArray(cal.races)) {
        filtered = cal.races
          .filter((r) => {
            const dateOk = !raceDate || r.date === raceDate;
            const venueOk =
              !raceVenue || r.venue === raceVenue || r.venueId === raceVenue;
            return dateOk && venueOk;
          })
          .sort(
            (a, b) =>
              (Number(a.number) || 0) - (Number(b.number) || 0) ||
              String(a.time || a.startTime || "").localeCompare(
                String(b.time || b.startTime || "")
              )
          );
      }
    }
  } else {
    const raceData = await loadJson("race");
    filtered = (raceData.races || [])
      .filter((r) => {
        const dateOk = !raceDate || r.date === raceDate;
        const venueOk = !raceVenue || r.venue === raceVenue;
        return dateOk && venueOk;
      })
      .sort(
        (a, b) =>
          (Number(a.number) || 0) - (Number(b.number) || 0) ||
          String(a.time || "").localeCompare(String(b.time || ""))
      );
  }

  renderRace(document.getElementById("race-list"), filtered, {
    raceDate,
    raceVenue,
    venueLabel,
    stage: session?.analysisStage?.stage,
    stageLabel: session
      ? `Stage${session.analysisStage.stage} ${session.analysisStage.short}`
      : "",
  });
}

/** 出馬表描画 */
export function renderHorseList(tbody, entries) {
  const rows = entries.slice(0, MAX_HORSE).map((entry) => {
    const tr = document.createElement("tr");

    const tdFrame = document.createElement("td");
    tdFrame.appendChild(
      createElement("span", {
        className: `frame-badge frame-badge--${entry.frame}`,
        text: entry.frame,
      })
    );
    tr.appendChild(tdFrame);

    tr.appendChild(createElement("td", { text: entry.number }));

    const tdHorse = createElement("td", {
      className: "entry-horse",
      text: entry.horse,
    });
    tr.appendChild(tdHorse);

    tr.appendChild(createElement("td", { text: entry.jockey }));

    const tdGrade = document.createElement("td");
    tdGrade.appendChild(createAiGrade(entry.grade));
    tr.appendChild(tdGrade);

    tr.appendChild(
      createElement("td", { text: `${Number(entry.winRate).toFixed(1)}%` })
    );

    const tdStars = document.createElement("td");
    tdStars.appendChild(
      createElement("span", {
        className: "entry-stars",
        text: formatStars(entry.stars),
        attrs: { "aria-label": `期待値 ${entry.stars}つ星` },
      })
    );
    tr.appendChild(tdStars);

    return tr;
  });

  renderTableBody(tbody, rows);
  applyCardStagger();
}

/** レース詳細画面 */
export async function initRaceDetailPage() {
  const params = getSearchParams();
  const raceDate = params.get("date") || "";
  const raceVenue = params.get("venue") || "";
  const venueLabel = params.get("venueLabel") || "";
  const raceNumber = params.get("race") || "";
  const raceName = params.get("name") || "";
  const raceTime = params.get("time") || "";

  document.getElementById("detail-date").textContent = raceDate || "未選択";
  document.getElementById("detail-venue").textContent = venueLabel || "未選択";
  document.getElementById("detail-race-number").textContent = raceNumber
    ? `${raceNumber}R`
    : "-";
  document.getElementById("detail-race-name").textContent = raceName || "-";
  document.getElementById("detail-race-time").textContent = raceTime || "-";

  const horsesData = await loadJson("horses");
  renderHorseList(
    document.getElementById("entry-table-body"),
    horsesData.entries
  );

  const listParams = new URLSearchParams({
    date: raceDate,
    venue: raceVenue,
    venueLabel: venueLabel,
  });

  document.getElementById("back-to-race-list").href =
    `race-list.html?${listParams.toString()}`;

  document.getElementById("go-analysis").addEventListener("click", () => {
    const analysisParams = new URLSearchParams({
      date: raceDate,
      venue: raceVenue,
      venueLabel: venueLabel,
      race: raceNumber || String(DEFAULT_RACE),
      name: raceName,
      time: raceTime,
      grade: params.get("grade") || "",
      stage: params.get("stage") || "",
    });

    navigateWithFade(`analysis.html?${analysisParams.toString()}`);
  });
}
