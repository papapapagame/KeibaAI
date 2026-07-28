/* ========================================
   Knowledge Validator — Ver8.4
   Validation失敗データは Graph へ登録しない
   ======================================== */

import { NODE_TYPE_SET, EDGE_TYPE_SET } from "./knowledge-types.js";
import { getNode, listNodes } from "./knowledge-node-manager.js";
import { listEdges } from "./knowledge-edge-manager.js";

export function validateNode(node) {
  const errors = [];
  if (!node?.id) errors.push({ code: "NODE_ID", message: "id 欠損" });
  if (!NODE_TYPE_SET.has(node?.type)) {
    errors.push({ code: "NODE_TYPE", message: `未知の Node 型: ${node?.type}` });
  }
  if (!node?.key && !node?.label) {
    errors.push({ code: "NODE_KEY", message: "key/label 欠損" });
  }
  return { ok: errors.length === 0, errors };
}

export function validateEdge(edge, options = {}) {
  const errors = [];
  if (!edge?.id) errors.push({ code: "EDGE_ID", message: "id 欠損" });
  if (!EDGE_TYPE_SET.has(edge?.type)) {
    errors.push({ code: "EDGE_TYPE", message: `未知の Edge 型: ${edge?.type}` });
  }
  if (!edge?.fromId || !edge?.toId) {
    errors.push({ code: "EDGE_ENDS", message: "from/to 欠損" });
  }
  if (edge?.fromId && edge?.toId && edge.fromId === edge.toId) {
    errors.push({ code: "SELF_LOOP", message: "自己ループ" });
  }
  if (options.requireNodes !== false) {
    if (edge?.fromId && !getNode(edge.fromId)) {
      errors.push({
        code: "MISSING_FROM",
        message: `欠損 Node(from): ${edge.fromId}`,
      });
    }
    if (edge?.toId && !getNode(edge.toId)) {
      errors.push({
        code: "MISSING_TO",
        message: `欠損 Node(to): ${edge.toId}`,
      });
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Graph-level integrity: orphans, cycles (directed), duplicates.
 */
export function validateGraph(nodes = [], edges = []) {
  const errors = [];
  const warnings = [];
  const nodeIds = new Set((nodes || []).map((n) => n.id));
  const seenNodes = new Set();
  const seenEdges = new Set();

  for (const n of nodes || []) {
    if (seenNodes.has(n.id)) {
      errors.push({ code: "DUP_NODE", message: `Node重複: ${n.id}` });
    }
    seenNodes.add(n.id);
  }
  for (const e of edges || []) {
    if (seenEdges.has(e.id)) {
      errors.push({ code: "DUP_EDGE", message: `Edge重複: ${e.id}` });
    }
    seenEdges.add(e.id);
    if (!nodeIds.has(e.fromId) || !nodeIds.has(e.toId)) {
      errors.push({
        code: "MISSING_NODE",
        message: `Edge端点欠損: ${e.id}`,
      });
    }
  }

  const connected = new Set();
  for (const e of edges || []) {
    connected.add(e.fromId);
    connected.add(e.toId);
  }
  for (const n of nodes || []) {
    if (!connected.has(n.id) && (nodes || []).length > 1) {
      warnings.push({ code: "ORPHAN", message: `孤立Node: ${n.id}` });
    }
  }

  const adj = new Map();
  for (const e of edges || []) {
    if (!adj.has(e.fromId)) adj.set(e.fromId, []);
    adj.get(e.fromId).push(e.toId);
  }
  const visiting = new Set();
  const visited = new Set();
  const reported = new Set();

  function dfs(u, stack) {
    visiting.add(u);
    stack.push(u);
    for (const v of adj.get(u) || []) {
      if (visiting.has(v)) {
        const key = `${v}|${u}`;
        if (!reported.has(key)) {
          reported.add(key);
          warnings.push({
            code: "CYCLE",
            message: `循環参照検知: ${v} ↔ …`,
          });
        }
        continue;
      }
      if (!visited.has(v)) dfs(v, stack);
    }
    stack.pop();
    visiting.delete(u);
    visited.add(u);
  }

  for (const n of nodes || []) {
    if (!visited.has(n.id)) dfs(n.id, []);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function findOrphanNodes() {
  const edgeList = listEdges();
  const connected = new Set();
  for (const e of edgeList) {
    connected.add(e.fromId);
    connected.add(e.toId);
  }
  return listNodes().filter((n) => !connected.has(n.id));
}

export const KnowledgeValidator = {
  node: validateNode,
  edge: validateEdge,
  graph: validateGraph,
  orphans: findOrphanNodes,
};
