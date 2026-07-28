/* ========================================
   Knowledge Query Engine — Ver8.4
   関連Node / Edge / 履歴 / 近似 / 関連度 / 重要度
   ======================================== */

import { getNode, listNodes } from "./knowledge-node-manager.js";
import { getEdge, listEdges } from "./knowledge-edge-manager.js";
import {
  getAdjacency,
  lookupByLabel,
  lookupByType,
  getIndexerState,
} from "./knowledge-indexer.js";

let queryState = { status: "idle", lastQuery: null, lastAt: null };

export function getQueryState() {
  return { ...queryState };
}

function markQuery(kind, detail) {
  queryState = {
    status: "ok",
    lastQuery: kind,
    detail,
    lastAt: new Date().toISOString(),
  };
}

/** 関連 Node 取得（1-hop / 2-hop） */
export function queryRelatedNodes(nodeId, options = {}) {
  const depth = Math.min(2, Number(options.depth) || 1);
  const start = getNode(nodeId);
  if (!start) {
    markQuery("relatedNodes", { nodeId, found: false });
    return [];
  }
  const visited = new Set([nodeId]);
  let frontier = [nodeId];
  const result = [];

  for (let d = 0; d < depth; d += 1) {
    const next = [];
    for (const id of frontier) {
      const adj = getAdjacency(id);
      const edgeIds = [...(adj.out || []), ...(adj.in || [])];
      for (const eid of edgeIds) {
        const e = getEdge(eid);
        if (!e) continue;
        const other = e.fromId === id ? e.toId : e.fromId;
        if (visited.has(other)) continue;
        visited.add(other);
        const n = getNode(other);
        if (n) {
          result.push({
            ...compactNode(n),
            hop: d + 1,
            viaEdge: e.type,
            relationWeight: e.weight,
          });
          next.push(other);
        }
      }
    }
    frontier = next;
  }

  if (options.type) {
    markQuery("relatedNodes", { nodeId, type: options.type });
    return result.filter((n) => n.type === options.type);
  }
  markQuery("relatedNodes", { nodeId, count: result.length });
  return result;
}

/** 関連 Edge 取得 */
export function queryRelatedEdges(nodeId) {
  const list = listEdges({ nodeId });
  markQuery("relatedEdges", { nodeId, count: list.length });
  return list.map(compactEdge);
}

/** 履歴検索（updatedAt / props.history） */
export function queryHistory(options = {}) {
  const type = options.type || null;
  let list = listNodes(type ? { type } : {});
  list = list
    .filter((n) => n.updatedAt || n.props?.history)
    .sort(
      (a, b) =>
        Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0)
    );
  if (options.limit) list = list.slice(0, options.limit);
  markQuery("history", { type, count: list.length });
  return list.map(compactNode);
}

/** 近似検索（label / key 部分一致） */
export function queryApproximate(term, options = {}) {
  const q = String(term || "").toLowerCase().trim();
  if (!q) return [];
  const exact = lookupByLabel(q);
  const nodes = listNodes(options.type ? { type: options.type } : {});
  const scored = [];
  for (const n of nodes) {
    const label = String(n.label || "").toLowerCase();
    const key = String(n.key || "").toLowerCase();
    let score = 0;
    if (exact.includes(n.id)) score = 100;
    else if (label === q || key === q) score = 95;
    else if (label.includes(q) || key.includes(q)) score = 70;
    else if (q.includes(label) && label.length > 1) score = 50;
    if (score > 0) {
      scored.push({ ...compactNode(n), matchScore: score });
    }
  }
  scored.sort((a, b) => b.matchScore - a.matchScore);
  const out = options.limit ? scored.slice(0, options.limit) : scored;
  markQuery("approximate", { term: q, count: out.length });
  return out;
}

/** 関連度検索（edge weight + shared neighbors） */
export function queryByRelation(nodeId, options = {}) {
  const related = queryRelatedNodes(nodeId, { depth: 1 });
  const scored = related.map((n) => {
    const shared = countSharedNeighbors(nodeId, n.id);
    const rel =
      (Number(n.relationWeight) || 1) * 40 +
      shared * 15 +
      (Number(n.scores?.connectivity) || 0) * 0.3;
    return { ...n, relationScore: clamp(Math.round(rel)) };
  });
  scored.sort((a, b) => b.relationScore - a.relationScore);
  markQuery("relation", { nodeId, count: scored.length });
  return options.limit ? scored.slice(0, options.limit) : scored;
}

/** 重要度検索 */
export function queryByImportance(options = {}) {
  let list = listNodes(options.type ? { type: options.type } : {});
  list = [...list].sort(
    (a, b) =>
      (b.scores?.importance || 0) - (a.scores?.importance || 0) ||
      (b.scores?.knowledgeScore || 0) - (a.scores?.knowledgeScore || 0)
  );
  const out = (options.limit ? list.slice(0, options.limit) : list).map(
    compactNode
  );
  markQuery("importance", { count: out.length });
  return out;
}

/** AI engines 向け: Horse 周辺の推論コンテキスト */
export function queryHorseContext(horseNameOrId, options = {}) {
  let node = getNode(horseNameOrId);
  if (!node) {
    const hits = queryApproximate(horseNameOrId, {
      type: "Horse",
      limit: 1,
    });
    if (hits[0]) node = getNode(hits[0].id);
  }
  if (!node) return null;
  const related = queryRelatedNodes(node.id, { depth: options.depth || 1 });
  const edges = queryRelatedEdges(node.id);
  markQuery("horseContext", { id: node.id });
  return {
    horse: compactNode(node),
    related,
    edges,
    evidence: related.filter((n) => n.type === "Evidence"),
    news: related.filter((n) => n.type === "News"),
    social: related.filter((n) => n.type === "Social"),
    learning: related.filter((n) => n.type === "Learning"),
  };
}

export function getQueryFacade() {
  return {
    relatedNodes: queryRelatedNodes,
    relatedEdges: queryRelatedEdges,
    history: queryHistory,
    approximate: queryApproximate,
    byRelation: queryByRelation,
    byImportance: queryByImportance,
    horseContext: queryHorseContext,
    byType: (type) => lookupByType(type).map((id) => compactNode(getNode(id))),
    state: getQueryState,
    indexer: getIndexerState,
  };
}

function countSharedNeighbors(a, b) {
  const neighbors = (nodeId) => {
    const set = new Set();
    const adj = getAdjacency(nodeId);
    for (const eid of [...(adj.out || []), ...(adj.in || [])]) {
      const e = getEdge(eid);
      if (!e) continue;
      set.add(e.fromId === nodeId ? e.toId : e.fromId);
    }
    return set;
  };
  const na = neighbors(a);
  const nb = neighbors(b);
  let shared = 0;
  for (const id of na) if (nb.has(id)) shared += 1;
  return shared;
}

function compactNode(n) {
  if (!n) return null;
  return {
    id: n.id,
    type: n.type,
    key: n.key,
    label: n.label,
    scores: n.scores,
    updatedAt: n.updatedAt,
    props: summarizeProps(n.props),
  };
}

function compactEdge(e) {
  return {
    id: e.id,
    type: e.type,
    fromId: e.fromId,
    toId: e.toId,
    weight: e.weight,
  };
}

function summarizeProps(props = {}) {
  if (!props || typeof props !== "object") return {};
  const {
    body: _b,
    text: _t,
    html: _h,
    posts: _p,
    comments: _c,
    ...rest
  } = props;
  // keep small metadata only
  const out = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v == null) continue;
    if (typeof v === "object" && !Array.isArray(v)) continue;
    if (Array.isArray(v) && v.length > 8) out[k] = v.slice(0, 8);
    else out[k] = v;
  }
  return out;
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export const KnowledgeQueryEngine = {
  relatedNodes: queryRelatedNodes,
  relatedEdges: queryRelatedEdges,
  history: queryHistory,
  approximate: queryApproximate,
  byRelation: queryByRelation,
  byImportance: queryByImportance,
  horseContext: queryHorseContext,
  facade: getQueryFacade,
  state: getQueryState,
};
