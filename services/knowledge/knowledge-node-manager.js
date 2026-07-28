/* ========================================
   Knowledge Node Manager — Ver8.4
   ======================================== */

import { NODE_TYPE_SET, nodeId } from "./knowledge-types.js";

/** @type {Map<string, object>} */
let nodes = new Map();

export function resetNodes() {
  nodes = new Map();
}

export function getNodeMap() {
  return nodes;
}

export function getNode(id) {
  return nodes.get(id) || null;
}

export function listNodes(filter = {}) {
  let list = [...nodes.values()];
  if (filter.type) list = list.filter((n) => n.type === filter.type);
  if (filter.types?.length) {
    const set = new Set(filter.types);
    list = list.filter((n) => set.has(n.type));
  }
  return list;
}

export function nodeCount() {
  return nodes.size;
}

/**
 * Create node object (not yet validated/inserted).
 */
export function buildNode(type, key, data = {}) {
  const id = data.id || nodeId(type, key);
  return {
    id,
    type,
    key: String(key || ""),
    label: data.label || String(key || id),
    props: data.props || {},
    updatedAt: data.updatedAt || new Date().toISOString(),
    scores: data.scores || null,
  };
}

/**
 * Insert node if type valid. Returns { ok, node, reason }.
 * Duplicate id → merge props (keep existing scores until rescoring).
 */
export function upsertNode(node, options = {}) {
  if (!node?.id || !NODE_TYPE_SET.has(node.type)) {
    return { ok: false, reason: "INVALID_TYPE_OR_ID", node: null };
  }
  const existing = nodes.get(node.id);
  if (existing && options.forbidDuplicate) {
    return { ok: false, reason: "DUP_NODE", node: existing };
  }
  if (existing) {
    const merged = {
      ...existing,
      label: node.label || existing.label,
      props: { ...existing.props, ...(node.props || {}) },
      updatedAt: node.updatedAt || existing.updatedAt,
      scores: node.scores || existing.scores,
    };
    nodes.set(merged.id, merged);
    return { ok: true, node: merged, merged: true };
  }
  nodes.set(node.id, node);
  return { ok: true, node, merged: false };
}

export function setNodeScores(id, scores) {
  const n = nodes.get(id);
  if (!n) return null;
  n.scores = { ...(n.scores || {}), ...scores };
  nodes.set(id, n);
  return n;
}

export const KnowledgeNodeManager = {
  reset: resetNodes,
  get: getNode,
  list: listNodes,
  count: nodeCount,
  build: buildNode,
  upsert: upsertNode,
  setScores: setNodeScores,
  map: getNodeMap,
};
