/* ========================================
   PAPAPA IQ KEIBA - race.js
   トップ / レース一覧 / レース詳細
   ======================================== */

import { DEFAULT_RACE, MAX_HORSE } from "./config.js";
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
  const raceData = await loadJson("race");

  clearElement(raceVenueSelect);
  raceVenueSelect.appendChild(createOption("", "開催場を選択"));
  raceData.venues.forEach((venue) => {
    raceVenueSelect.appendChild(createOption(venue.value, venue.label));
  });

  goRaceListButton.addEventListener("click", () => {
    const raceDate = raceDateInput.value;
    const raceVenue = raceVenueSelect.value;
    const raceVenueLabel =
      raceVenueSelect.options[raceVenueSelect.selectedIndex]?.text || "";

    const params = new URLSearchParams({
      date: raceDate,
      venue: raceVenue,
      venueLabel: raceVenue ? raceVenueLabel : "",
    });

    navigateWithFade(`race-list.html?${params.toString()}`);
  });
}

/** レース一覧描画 */
export function renderRace(container, races, context) {
  clearElement(container);

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

    container.appendChild(createCard("race-card", [header, time, detailBtn]));
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

  document.getElementById("display-date").textContent = raceDate || "未選択";
  document.getElementById("display-venue").textContent = venueLabel || "未選択";

  const raceData = await loadJson("race");
  renderRace(document.getElementById("race-list"), raceData.races, {
    raceDate,
    raceVenue,
    venueLabel,
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
    });

    navigateWithFade(`analysis.html?${analysisParams.toString()}`);
  });
}
