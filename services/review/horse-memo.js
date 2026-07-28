/* ========================================
   Horse AI Memo helpers — Ver6.5
   ======================================== */

import { hashSeed, pickVariant, toNum } from "./utils.js";

/**
 * レース結果から馬ごとの AI メモ（タグ＋短文）を生成
 */
export function buildHorseMemos({
  entries = [],
  winnerAnalysis,
  loserAnalysis,
  raceFlow,
  raceId,
} = {}) {
  const memos = [];
  const pace = raceFlow?.pace?.label || "標準";
  const track = raceFlow?.track?.condition || "良";

  if (winnerAnalysis) {
    const tags = [];
    for (const f of winnerAnalysis.winFactors || []) {
      if (f.code === "pace_suit") tags.push("ハイペース耐性");
      if (f.code === "finish") tags.push("終い優秀");
      if (f.code === "track_apt") tags.push(`${track}馬場適性`);
      if (f.code === "position") tags.push("位置取り上手");
    }
    if (toNum(winnerAnalysis.popularity, 99) >= 4) tags.push("穴で勝ち切り");
    tags.push(...(winnerAnalysis.aptitude || []).slice(0, 1).map((a) => a.label));

    memos.push({
      horseId: winnerAnalysis.horseId || winnerAnalysis.number,
      name: winnerAnalysis.name,
      raceId,
      tags: unique(tags).slice(0, 6),
      text: pickVariant(hashSeed(winnerAnalysis.name, "wmemo"), [
        "今回の勝ち方は再現候補。同条件で中心視。",
        "勝因が明確で、次走も評価を維持しやすい。",
        "能力の底上げが見えた一戦。メモを蓄積。",
      ]),
      why: winnerAnalysis.explain,
    });
  }

  for (const loser of loserAnalysis?.items || []) {
    const tags = (loser.reasons || []).map((r) => {
      if (r.code === "distance") return "距離延長注意";
      if (r.code === "track") return `${track}苦手傾向`;
      if (r.code === "pace") return "ペース脆さ";
      if (r.code === "trip") return "位置取り課題";
      if (r.code === "market") return "過熱注意";
      if (r.code === "prep") return "調整見極め";
      if (r.code === "flow") return "展開次第";
      return r.label;
    });
    memos.push({
      horseId: loser.horseId || loser.number,
      name: loser.name,
      raceId,
      tags: unique(tags).slice(0, 6),
      text: `敗因「${(loser.reasons || []).map((r) => r.label).join("・")}」を次走の警戒材料に。`,
      why: loser.explain,
    });
  }

  // 好走穴馬
  for (const e of entries) {
    if (toNum(e.finish, 99) <= 3 && toNum(e.popularity, 99) >= 5) {
      const id = e.horseId || e.number;
      if (memos.some((m) => String(m.horseId) === String(id))) continue;
      memos.push({
        horseId: id,
        name: e.name || e.horse,
        raceId,
        tags: ["上昇気配", pace === "ハイ" ? "差し向き" : "再評価"],
        text: "人気薄からの好走。能力の再査定が必要。",
        why: "着順×人気ギャップが市場評価の遅れを示す。",
      });
    }
  }

  return memos;
}

function unique(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}
