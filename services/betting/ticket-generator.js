/* ========================================
   TicketGenerator + formations — Ver6.0
   ======================================== */

import { combinations, permutations, uniqueTickets } from "./utils.js";

/**
 * 本命/対抗/穴/危険 から券種・フォーメーション買い目を生成
 */
export function generateTickets(roles = {}, options = {}) {
  const honmei = roles.honmei || [];
  const taikou = roles.taikou || [];
  const ana = roles.ana || [];
  const danger = roles.danger || [];
  const pool = uniqueNums([...honmei, ...taikou, ...ana]).slice(0, 8);
  const axis = honmei[0];
  const second = taikou[0] || ana[0] || pool[1];
  const third = ana[0] || taikou[1] || pool[2];
  const strategy = options.strategy || "バランス型";

  const tickets = [];

  // 単勝 / 複勝
  if (axis) {
    tickets.push(ticket("単勝", "単勝", String(axis), [axis], strategy));
    tickets.push(ticket("複勝", "複勝", String(axis), [axis], strategy));
  }
  if (ana[0] && strategy.includes("穴")) {
    tickets.push(ticket("単勝", "穴単勝", String(ana[0]), [ana[0]], strategy));
  }

  // 馬連 / ワイド / 馬単
  if (axis && second) {
    tickets.push(
      ticket("馬連", "軸1頭流し", `${axis}-${second}`, [axis, second], strategy)
    );
    tickets.push(
      ticket("ワイド", "軸1頭流し", `${axis}-${second}`, [axis, second], strategy)
    );
    tickets.push(
      ticket("馬単", "軸流し", `${axis}>${second}`, [axis, second], strategy)
    );
    if (third) {
      tickets.push(
        ticket(
          "馬連",
          "フォーメーション",
          `${axis}-${second}/${third}`,
          [axis, second, third],
          strategy
        )
      );
      tickets.push(
        ticket(
          "ワイド",
          "フォーメーション",
          `${axis}-${[second, third].join(",")}`,
          [axis, second, third],
          strategy
        )
      );
    }
  }

  // 三連複
  if (axis && second && third) {
    tickets.push(
      ticket(
        "三連複",
        "1頭軸",
        `${axis}-${second}-${third}`,
        [axis, second, third],
        strategy
      )
    );
    const partners = uniqueNums([second, third, ...ana, ...taikou]).filter(
      (n) => n !== axis
    );
    if (partners.length >= 2) {
      tickets.push(
        ticket(
          "三連複",
          "1頭軸流し",
          `${axis}→${partners.slice(0, 4).join(",")}`,
          [axis, ...partners.slice(0, 4)],
          strategy
        )
      );
    }
    if (taikou[0] && ana[0]) {
      tickets.push(
        ticket(
          "三連複",
          "2頭軸",
          `${axis},${taikou[0]}-${ana.slice(0, 3).join(",") || third}`,
          uniqueNums([axis, taikou[0], ...ana.slice(0, 3), third]),
          strategy
        )
      );
    }
    const box3 = uniqueNums([axis, second, third, ana[1]].filter(Boolean)).slice(
      0,
      4
    );
    if (box3.length >= 3) {
      tickets.push(
        ticket("三連複", "BOX", box3.join("-"), box3, strategy)
      );
      tickets.push(
        ticket(
          "三連複",
          "フォーメーション",
          `${axis}-${box3.filter((n) => n !== axis).join("/")}`,
          box3,
          strategy
        )
      );
    }
  }

  // 三連単
  if (axis && second && third) {
    tickets.push(
      ticket(
        "三連単",
        "フォーメーション",
        `${axis}>${second}>${third}`,
        [axis, second, third],
        strategy
      )
    );
    tickets.push(
      ticket(
        "三連単",
        "マルチ",
        `${axis}-${second}-${third} マルチ`,
        [axis, second, third],
        strategy
      )
    );
    const box = uniqueNums([axis, second, third, ana[0]].filter(Boolean)).slice(
      0,
      3
    );
    if (box.length === 3) {
      tickets.push(ticket("三連単", "BOX", box.join("-"), box, strategy));
    }
    if (ana[0]) {
      tickets.push(
        ticket(
          "三連単",
          "軸流し",
          `${axis}>${[second, third, ana[0]].filter(Boolean).join(",")}`,
          uniqueNums([axis, second, third, ana[0]]),
          strategy
        )
      );
    }
  }

  // 危険馬を明示的に外す注記付き控え
  if (danger[0] && axis && second) {
    tickets.push(
      ticket(
        "馬連",
        "危険除外",
        `${axis}-${second} (×${danger[0]})`,
        [axis, second],
        strategy,
        { exclude: danger[0] }
      )
    );
  }

  return uniqueTickets(tickets);
}

/**
 * フォーメーションの点数概算
 */
export function estimatePoints(ticket) {
  const nums = ticket.numbers || [];
  const f = ticket.formation || "";
  if (ticket.type === "単勝" || ticket.type === "複勝") return 1;
  if (ticket.type === "馬連" || ticket.type === "ワイド") {
    if (f.includes("BOX") && nums.length >= 2) {
      return combinations(nums, 2).length;
    }
    return Math.max(1, nums.length - 1);
  }
  if (ticket.type === "馬単") {
    return Math.max(1, nums.length - 1);
  }
  if (ticket.type === "三連複") {
    if (f.includes("BOX")) return combinations(nums, 3).length || 1;
    if (f.includes("2頭軸")) return Math.max(1, nums.length - 2);
    return Math.max(1, combinations(nums.slice(1), 2).length || nums.length - 1);
  }
  if (ticket.type === "三連単") {
    if (f.includes("BOX")) return permutations(nums.slice(0, 3)).length || 6;
    if (f.includes("マルチ")) return 6;
    return Math.max(1, (nums.length - 1) * Math.max(1, nums.length - 2));
  }
  return 1;
}

function ticket(type, formation, selection, numbers, strategy, extra = {}) {
  return {
    type,
    formation,
    selection,
    numbers: uniqueNums(numbers),
    strategy,
    ...extra,
  };
}

function uniqueNums(list) {
  const out = [];
  for (const n of list || []) {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) continue;
    if (!out.includes(v)) out.push(v);
  }
  return out;
}
