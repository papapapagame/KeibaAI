/* ========================================
   PAPAPA IQ KEIBA - Knowledge Graph API
   Ver8.4
   ======================================== */

export {
  KnowledgeGraphManager,
  KNOWLEDGE_GRAPH_VERSION,
  loadKnowledgeGraphForAi,
  getKnowledgeDashboard,
  getKnowledgeQuery,
  enrichEngineContext,
  toUnified as knowledgeToUnified,
  queryHorseContext,
  queryRelatedNodes,
  queryByImportance,
} from "./knowledge-graph-manager.js";

export {
  KnowledgeNodeManager,
  buildNode,
  upsertNode,
  listNodes,
  getNode,
  resetNodes,
} from "./knowledge-node-manager.js";

export {
  KnowledgeEdgeManager,
  buildEdge,
  upsertEdge,
  listEdges,
  resetEdges,
} from "./knowledge-edge-manager.js";

export {
  KnowledgeIndexer,
  rebuildIndex,
  getIndexerState,
} from "./knowledge-indexer.js";

export {
  KnowledgeQueryEngine,
  getQueryFacade,
  queryHistory,
  queryApproximate,
  queryByRelation,
  queryRelatedEdges,
} from "./knowledge-query-engine.js";

export {
  KnowledgeValidator,
  validateNode,
  validateEdge,
  validateGraph,
} from "./knowledge-validator.js";

export {
  KnowledgeSynchronizer,
  syncKnowledgeGraph,
  getSyncState,
} from "./knowledge-synchronizer.js";

export { NODE_TYPE, EDGE_TYPE, nodeId } from "./knowledge-types.js";
