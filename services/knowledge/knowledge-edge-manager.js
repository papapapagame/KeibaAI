/* ========================================
   Knowledge Edge Manager — Ver8.4
   ======================================== */

import { EDGE_TYPE_SET } from "./knowledge-types.js";

/** @type {Map<string, object>} */
let edges = new Map();

export function resetEdges() {
  edges = new Map();
}

export function getEdgeMap() {
  return edges;
}

export function edgeId(type, fromId, toId) {
  return `${type}|${fromId}|${toId}`;
}

export function getEdge(id) {
  return edges.get(id) || null;
}

export function listEdges(filter = {}) {
  let list = [...edges.values()];
  if (filter.type) list = list.filter((e) => e.type === filter.type);
  if (filter.fromId) list = list.filter((e) => e.fromId === filter.fromId);
  if (filter.toId) list = list.filter((e) => e.toId === filter.toId);
  if (filter.nodeId) {
    list = list.filter(
      (e) => e.fromId === filter.nodeId || e.toId === filter.nodeId
    );
  }
  return list;
}

export function edgeCount() {
  return edges.size;
}

export function buildEdge(type, fromId, toId, data = {}) {
  const id = data.id || edgeId(type, fromId, toId);
  return {
    id,
    type,
    fromId,
    toId,
    weight: data.weight != null ? Number(data.weight) : 1,
    props: data.props || {},
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

export function upsertEdge(edge, options = {}) {
  if (!edge?.id || !EDGE_TYPE_SET.has(edge.type)) {
    return { ok: false, reason: "INVALID_TYPE_OR_ID", edge: null };
  }
  if (!edge.fromId || !edge.toId) {
    return { ok: false, reason: "MISSING_ENDS", edge: null };
  }
  if (edge.fromId === edge.toId) {
    return { ok: false, reason: "SELF_LOOP", edge: null };
  }
  const existing = edges.get(edge.id);
  if (existing && options.forbidDuplicate) {
    return { ok: false, reason: "DUP_EDGE", edge: existing };
  }
  if (existing) {
    const merged = {
      ...existing,
      weight: edge.weight != null ? edge.weight : existing.weight,
      props: { ...existing.props, ...(edge.props || {}) },
      updatedAt: edge.updatedAt || existing.updatedAt,
    };
    edges.set(merged.id, merged);
    return { ok: true, edge: merged, merged: true };
  }
  edges.set(edge.id, edge);
  return { ok: true, edge, merged: false };
}

export const KnowledgeEdgeManager = {
  reset: resetEdges,
  get: getEdge,
  list: listEdges,
  count: edgeCount,
  build: buildEdge,
  upsert: upsertEdge,
  id: edgeId,
  map: getEdgeMap,
};
