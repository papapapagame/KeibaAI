/* ========================================
   Knowledge Indexer — Ver8.4
   ======================================== */

import { listNodes } from "./knowledge-node-manager.js";
import { listEdges } from "./knowledge-edge-manager.js";

let indexState = {
  status: "idle",
  byType: {},
  byLabel: {},
  byKey: {},
  adjacency: {},
  updatedAt: null,
};

export function getIndexerState() {
  return { ...indexState };
}

export function rebuildIndex() {
  indexState = {
    status: "building",
    byType: {},
    byLabel: {},
    byKey: {},
    adjacency: {},
    updatedAt: null,
  };

  for (const n of listNodes()) {
    if (!indexState.byType[n.type]) indexState.byType[n.type] = [];
    indexState.byType[n.type].push(n.id);

    const labelKey = String(n.label || "").toLowerCase();
    if (labelKey) {
      if (!indexState.byLabel[labelKey]) indexState.byLabel[labelKey] = [];
      indexState.byLabel[labelKey].push(n.id);
    }
    const key = String(n.key || "").toLowerCase();
    if (key) {
      if (!indexState.byKey[key]) indexState.byKey[key] = [];
      indexState.byKey[key].push(n.id);
    }
    indexState.adjacency[n.id] = { out: [], in: [] };
  }

  for (const e of listEdges()) {
    if (!indexState.adjacency[e.fromId]) {
      indexState.adjacency[e.fromId] = { out: [], in: [] };
    }
    if (!indexState.adjacency[e.toId]) {
      indexState.adjacency[e.toId] = { out: [], in: [] };
    }
    indexState.adjacency[e.fromId].out.push(e.id);
    indexState.adjacency[e.toId].in.push(e.id);
  }

  indexState.status = "ready";
  indexState.updatedAt = new Date().toISOString();
  return getIndexerState();
}

export function lookupByType(type) {
  return indexState.byType[type] || [];
}

export function lookupByLabel(label) {
  return indexState.byLabel[String(label || "").toLowerCase()] || [];
}

export function getAdjacency(nodeId) {
  return indexState.adjacency[nodeId] || { out: [], in: [] };
}

export const KnowledgeIndexer = {
  rebuild: rebuildIndex,
  state: getIndexerState,
  byType: lookupByType,
  byLabel: lookupByLabel,
  adjacency: getAdjacency,
};
