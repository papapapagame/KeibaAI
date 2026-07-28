/* ========================================
   Knowledge Scoring — Ver8.4 Graph Intelligence
   Importance / Reliability / Freshness / Connectivity / Knowledge Score
   ======================================== */

import { listNodes, setNodeScores } from "./knowledge-node-manager.js";
import { listEdges } from "./knowledge-edge-manager.js";

export function scoreGraphNodes(now = Date.now()) {
  const edges = listEdges();
  const degree = new Map();
  for (const e of edges) {
    degree.set(e.fromId, (degree.get(e.fromId) || 0) + 1);
    degree.set(e.toId, (degree.get(e.toId) || 0) + 1);
  }
  const maxDeg = Math.max(1, ...degree.values(), 1);

  const scored = [];
  for (const n of listNodes()) {
    const deg = degree.get(n.id) || 0;
    const connectivity = clamp(Math.round((deg / maxDeg) * 100));
    const freshness = freshnessScore(n.updatedAt, now);
    const reliability = clamp(
      Number(n.props?.reliability) ||
        Number(n.props?.scores?.reliability) ||
        typeReliability(n.type)
    );
    const importance = clamp(
      Number(n.props?.importance) ||
        Number(n.props?.scores?.importance) ||
        typeImportance(n.type) + Math.round(connectivity * 0.15)
    );
    const knowledgeScore = clamp(
      Math.round(
        importance * 0.3 +
          reliability * 0.25 +
          freshness * 0.2 +
          connectivity * 0.25
      )
    );
    const scores = {
      importance,
      reliability,
      freshness,
      connectivity,
      knowledgeScore,
    };
    setNodeScores(n.id, scores);
    scored.push({ id: n.id, type: n.type, scores });
  }
  return scored;
}

export function aggregateKnowledgeScore(nodes = null) {
  const list = nodes || listNodes();
  if (!list.length) return 0;
  const sum = list.reduce(
    (s, n) => s + (Number(n.scores?.knowledgeScore) || 0),
    0
  );
  return Math.round(sum / list.length);
}

function typeImportance(type) {
  const map = {
    Horse: 80,
    Race: 85,
    Evidence: 75,
    Discussion: 78,
    Prediction: 82,
    Reason: 70,
    Odds: 72,
    Weather: 65,
    News: 60,
    Social: 55,
    Learning: 68,
    Jockey: 70,
    Trainer: 65,
    Entry: 74,
    Draw: 70,
    Track: 66,
    AnalysisStage: 60,
    Racecourse: 62,
    Distance: 58,
    Surface: 58,
    Confidence: 72,
  };
  return map[type] || 50;
}

function typeReliability(type) {
  const map = {
    Entry: 92,
    Draw: 88,
    Odds: 84,
    Weather: 80,
    Race: 86,
    Horse: 78,
    Evidence: 70,
    Discussion: 74,
    Learning: 68,
    News: 62,
    Social: 52,
    Prediction: 70,
  };
  return map[type] || 60;
}

function freshnessScore(iso, now) {
  if (!iso) return 40;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 40;
  const hours = (now - t) / 3600000;
  if (hours <= 1) return 100;
  if (hours <= 6) return 85;
  if (hours <= 24) return 70;
  if (hours <= 72) return 50;
  return 30;
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(n) || 0));
}

export const KnowledgeScoring = {
  scoreAll: scoreGraphNodes,
  aggregate: aggregateKnowledgeScore,
};
