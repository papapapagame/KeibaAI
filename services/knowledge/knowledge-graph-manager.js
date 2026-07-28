/* ========================================
   Knowledge Graph Manager — Ver8.4
   AI推論・検索・関連性分析の共通基盤
   ======================================== */

import { syncKnowledgeGraph, getSyncState } from "./knowledge-synchronizer.js";
import { listNodes, getNode, nodeCount } from "./knowledge-node-manager.js";
import { listEdges, edgeCount } from "./knowledge-edge-manager.js";
import { getIndexerState, rebuildIndex } from "./knowledge-indexer.js";
import {
  getQueryFacade,
  getQueryState,
  queryHorseContext,
  queryRelatedNodes,
  queryByImportance,
} from "./knowledge-query-engine.js";
import { aggregateKnowledgeScore } from "./knowledge-scoring.js";
import { validateGraph } from "./knowledge-validator.js";
import {
  createKnowledgeGraph,
  createKnowledgeNode,
  createKnowledgeEdge,
} from "../models/unified.js";
import { getLearningDashboard } from "../learning/index.js";

export const KNOWLEDGE_GRAPH_VERSION = "8.4.0";

let lastBundle = null;
let lastSyncFingerprint = null;

function buildContextFingerprint(options = {}) {
  const ranked = options.ranked || options.horses || [];
  const top = ranked
    .slice(0, 5)
    .map((h) => `${h.number}:${h.horse || h.horseName || ""}`)
    .join(",");
  return [
    options.raceKey || "",
    options.stage ?? "",
    options.discussionBundle?.fingerprint ||
      options.discussionBundle?.count ||
      "",
    options.explainBundle?.updatedAt || options.explainBundle?.fetchedAt || "",
    options.newsBundle?.fingerprint || options.newsBundle?.count || "",
    options.socialBundle?.fingerprint || options.socialBundle?.count || "",
    top,
  ].join("|");
}

/**
 * Build / refresh Knowledge Graph from analysis context.
 * Used by Discussion / Explain / Learning / Prediction via query facade.
 * Ver9.0: 同一コンテキストなら再同期をスキップ
 */
export function loadKnowledgeGraphForAi(options = {}) {
  const fp = buildContextFingerprint(options);
  if (
    lastBundle?.ok &&
    lastSyncFingerprint &&
    fp === lastSyncFingerprint &&
    options.force !== true
  ) {
    return {
      ...lastBundle,
      message: "Knowledge Graph unchanged (skipped sync)",
      syncSkipped: true,
    };
  }

  let learningDashboard = options.learningDashboard || null;
  try {
    if (!learningDashboard) {
      learningDashboard = getLearningDashboard({ ensureDemo: false });
    }
  } catch {
    learningDashboard = null;
  }

  const syncResult = syncKnowledgeGraph({
    race: options.race || {},
    horses: options.horses || options.ranked || [],
    ranked: options.ranked || [],
    stage: options.stage,
    raceKey: options.raceKey || "",
    entryBundle: options.entryBundle,
    drawBundle: options.drawBundle,
    oddsBundle: options.oddsBundle,
    weatherBundle: options.weatherBundle,
    newsBundle: options.newsBundle,
    socialBundle: options.socialBundle,
    discussionBundle: options.discussionBundle || options.discussion,
    explainBundle: options.explainBundle || options.explain,
    learningDashboard,
  });

  const query = getQueryFacade();
  const aiKnowledge = toAiKnowledgePayload(query);
  const unified = toUnified(syncResult);

  lastSyncFingerprint = fp;
  lastBundle = {
    ok: syncResult.ok,
    version: KNOWLEDGE_GRAPH_VERSION,
    message: syncResult.sync?.message || "",
    nodeCount: syncResult.nodeCount,
    edgeCount: syncResult.edgeCount,
    knowledgeScore: syncResult.knowledgeScore,
    updatedAt: syncResult.updatedAt,
    sync: syncResult.sync,
    validation: syncResult.validation,
    indexer: getIndexerState(),
    queryState: getQueryState(),
    aiKnowledge,
    query,
    unified,
    status: {
      label: syncResult.ok ? "Graph Ready" : "Graph Degraded",
      nodeCount: syncResult.nodeCount,
      edgeCount: syncResult.edgeCount,
      knowledgeScore: syncResult.knowledgeScore,
    },
    fetchedAt: syncResult.updatedAt,
    stageNote: "Knowledge Graph は AI 推論基盤（表示用DBではない）",
    syncSkipped: false,
    fingerprint: fp,
  };

  return lastBundle;
}

export function getKnowledgeDashboard() {
  return {
    version: KNOWLEDGE_GRAPH_VERSION,
    bundle: lastBundle,
    sync: getSyncState(),
    indexer: getIndexerState(),
    queryState: getQueryState(),
    nodeCount: nodeCount(),
    edgeCount: edgeCount(),
    knowledgeScore: aggregateKnowledgeScore(),
    validation: lastBundle?.validation || null,
    updatedAt: lastBundle?.updatedAt || getSyncState().lastAt,
  };
}

/** Engines 共通: Knowledge Graph 経由のクエリ */
export function getKnowledgeQuery() {
  return getQueryFacade();
}

export function enrichEngineContext(engineName, context = {}) {
  const query = getQueryFacade();
  const horseName = context.horseName || context.horse || null;
  const related = horseName ? query.horseContext(horseName) : null;
  const top = query.byImportance({ limit: 8 });
  return {
    engine: engineName,
    via: "KnowledgeGraph",
    horseContext: related,
    topImportant: top,
    graphMeta: {
      nodeCount: nodeCount(),
      edgeCount: edgeCount(),
      knowledgeScore: aggregateKnowledgeScore(),
    },
  };
}

export function toAiKnowledgePayload(query = getQueryFacade()) {
  const nodes = listNodes()
    .slice()
    .sort(
      (a, b) =>
        (b.scores?.knowledgeScore || 0) - (a.scores?.knowledgeScore || 0)
    )
    .slice(0, 40)
    .map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      scores: n.scores,
    }));
  const edges = listEdges()
    .slice(0, 80)
    .map((e) => ({
      id: e.id,
      type: e.type,
      fromId: e.fromId,
      toId: e.toId,
      weight: e.weight,
    }));

  return {
    available: nodeCount() > 0,
    version: KNOWLEDGE_GRAPH_VERSION,
    nodeCount: nodeCount(),
    edgeCount: edgeCount(),
    knowledgeScore: aggregateKnowledgeScore(),
    topNodes: nodes.slice(0, 12),
    nodes,
    edges,
    // query handles (serializable descriptors only — functions not included)
    queryCapabilities: [
      "relatedNodes",
      "relatedEdges",
      "history",
      "approximate",
      "byRelation",
      "byImportance",
      "horseContext",
    ],
  };
}

export function toUnified(syncResult = {}) {
  const nodes = listNodes().map((n) => createKnowledgeNode(n));
  const edges = listEdges().map((e) => createKnowledgeEdge(e));
  const validation =
    syncResult.validation || validateGraph(listNodes(), listEdges());

  return createKnowledgeGraph({
    available: true,
    version: KNOWLEDGE_GRAPH_VERSION,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    knowledgeScore: syncResult.knowledgeScore ?? aggregateKnowledgeScore(),
    nodes: nodes.slice(0, 200),
    edges: edges.slice(0, 400),
    validation,
    syncState: getSyncState(),
    indexerState: getIndexerState(),
    queryState: getQueryState(),
    updatedAt: syncResult.updatedAt || new Date().toISOString(),
  });
}

export {
  queryHorseContext,
  queryRelatedNodes,
  queryByImportance,
  rebuildIndex,
  getNode,
};

export const KnowledgeGraphManager = {
  loadForAi: loadKnowledgeGraphForAi,
  dashboard: getKnowledgeDashboard,
  query: getKnowledgeQuery,
  enrich: enrichEngineContext,
  toUnified,
  version: KNOWLEDGE_GRAPH_VERSION,
};
