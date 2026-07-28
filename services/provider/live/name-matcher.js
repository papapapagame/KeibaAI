/* ========================================
   Name matcher — タイトルから馬名・騎手名を紐付け（メタのみ）
   ======================================== */

/**
 * 候補名がテキストに含まれるものを返す（部分一致・長い名優先）
 */
export function matchNamesInText(text = "", candidates = []) {
  const t = String(text || "");
  if (!t || !candidates?.length) return [];
  const uniq = [
    ...new Set(
      (candidates || [])
        .map((n) => String(n || "").trim())
        .filter((n) => n.length >= 2)
    ),
  ].sort((a, b) => b.length - a.length);

  const hit = [];
  for (const name of uniq) {
    if (t.includes(name)) hit.push(name);
  }
  return hit;
}

export function attachMatchedNames(items = [], options = {}) {
  const horses = options.horseNames || options.horses || [];
  const jockeys = options.jockeyNames || options.jockeys || [];
  const trainers = options.trainerNames || options.trainers || [];

  return (items || []).map((item) => {
    const title = item.title || "";
    const matchedHorses = [
      ...new Set([
        ...(item.horses || []),
        ...matchNamesInText(title, horses),
      ]),
    ];
    const matchedJockeys = [
      ...new Set([
        ...(item.jockeys || []),
        ...matchNamesInText(title, jockeys),
      ]),
    ];
    const matchedTrainers = [
      ...new Set([
        ...(item.trainers || []),
        ...matchNamesInText(title, trainers),
      ]),
    ];
    return {
      ...item,
      horses: matchedHorses,
      jockeys: matchedJockeys,
      trainers: matchedTrainers,
    };
  });
}

export function buildRaceNewsQueries(options = {}) {
  const venue =
    options.venueLabel ||
    options.venueId ||
    options.venue ||
    "";
  const raceName = String(options.raceName || options.name || "").trim();
  const horses = (options.horseNames || []).slice(0, 3).filter(Boolean);
  const queries = [];

  if (venue && raceName) {
    queries.push(`${venue} ${raceName} 競馬`);
  } else if (venue) {
    queries.push(`${venue} 競馬`);
  }
  if (horses.length) {
    queries.push(`${horses.join(" OR ")} 競馬`);
  }
  // YouTube 言及（Google News 経由・本文なしメタのみ）
  queries.push("競馬 site:youtube.com");
  // 汎用フォールバック
  queries.push("競馬");

  return [...new Set(queries.map((q) => q.trim()).filter(Boolean))].slice(
    0,
    4
  );
}
