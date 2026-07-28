/* ========================================
   PAPAPA IQ KEIBA - AI Discussion Engine API
   Ver8.2
   ======================================== */

export {
  DiscussionManager,
  DISCUSSION_ENGINE_VERSION,
  loadDiscussionForAi,
  getDiscussionDashboard,
  applyDiscussionScoreAdjustments,
  toUnified as discussionToUnified,
} from "./discussion-manager.js";

export {
  DiscussionEngine,
  runDiscussion,
  toAiDiscussionPayload,
} from "./discussion-engine.js";

export {
  EvidenceCollector,
  collectEvidence,
} from "./evidence-collector.js";

export {
  ConflictResolver,
  resolveConflicts,
  resolutionScore,
} from "./conflict-resolver.js";

export {
  ConsensusEngine,
  buildConsensus,
} from "./consensus-engine.js";

export {
  ReasoningBuilder,
  buildReasoning,
} from "./reasoning-builder.js";

export {
  DiscussionValidator,
  validateDiscussionPayload,
} from "./discussion-validator.js";

export {
  EVIDENCE_SOURCE,
  EVIDENCE_SOURCE_LABEL,
  CLAIM_TYPE,
} from "./evidence-sources.js";
