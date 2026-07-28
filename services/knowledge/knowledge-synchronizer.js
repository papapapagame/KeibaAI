/* ========================================
   Knowledge Synchronizer — Ver8.4
   各 Engine データを Graph へ同期（失敗データは登録しない）
   ======================================== */

import { NODE_TYPE, EDGE_TYPE } from "./knowledge-types.js";
import {
  resetNodes,
  buildNode,
  upsertNode,
  listNodes,
} from "./knowledge-node-manager.js";
import {
  resetEdges,
  buildEdge,
  upsertEdge,
  listEdges,
} from "./knowledge-edge-manager.js";
import { validateNode, validateEdge, validateGraph } from "./knowledge-validator.js";
import { rebuildIndex } from "./knowledge-indexer.js";
import { scoreGraphNodes, aggregateKnowledgeScore } from "./knowledge-scoring.js";

let syncState = {
  status: "idle",
  lastAt: null,
  nodeCount: 0,
  edgeCount: 0,
  rejected: 0,
  message: "",
};

export function getSyncState() {
  return { ...syncState };
}

function safeAddNode(type, key, data = {}) {
  const node = buildNode(type, key, data);
  const v = validateNode(node);
  if (!v.ok) {
    syncState.rejected += 1;
    return null;
  }
  const r = upsertNode(node);
  return r.ok ? r.node : null;
}

function safeAddEdge(type, fromId, toId, data = {}) {
  if (!fromId || !toId) {
    syncState.rejected += 1;
    return null;
  }
  const edge = buildEdge(type, fromId, toId, data);
  const v = validateEdge(edge, { requireNodes: true });
  if (!v.ok) {
    syncState.rejected += 1;
    return null;
  }
  const r = upsertEdge(edge);
  return r.ok ? r.edge : null;
}

/**
 * Full reset + rebuild from analysis context.
 */
export function syncKnowledgeGraph(context = {}) {
  syncState = {
    status: "syncing",
    lastAt: null,
    nodeCount: 0,
    edgeCount: 0,
    rejected: 0,
    message: "",
  };

  resetNodes();
  resetEdges();

  const race = context.race || {};
  const horses = context.horses || context.ranked || [];
  const stage = Number(context.stage) || 0;
  const nowIso = new Date().toISOString();

  // --- Race / Course / Weather / Track / Stage ---
  const raceKey =
    context.raceKey ||
    `${race.date || ""}_${race.venue || race.venueId || ""}_${race.number || ""}`;
  const raceNode = safeAddNode(NODE_TYPE.RACE, raceKey, {
    label: race.raceName || race.name || `${race.number || "?"}R`,
    updatedAt: nowIso,
    props: {
      date: race.date,
      venue: race.venue || race.venueId,
      number: race.number,
      distance: race.distance,
      track: race.track,
    },
  });

  const courseKey = race.venue || race.venueId || race.venueLabel || "unknown";
  const courseNode = safeAddNode(NODE_TYPE.RACECOURSE, courseKey, {
    label: race.venueLabel || String(courseKey),
    updatedAt: nowIso,
  });

  const distVal =
    typeof race.distance === "object"
      ? race.distance?.meters
      : race.distance;
  const distNode =
    distVal != null
      ? safeAddNode(NODE_TYPE.DISTANCE, `${distVal}m`, {
          label: `${distVal}m`,
          updatedAt: nowIso,
          props: { meters: Number(distVal) || 0 },
        })
      : null;

  const surfaceVal =
    race.track ||
    race.surface?.value ||
    race.surface ||
    "";
  const surfaceNode = surfaceVal
    ? safeAddNode(NODE_TYPE.SURFACE, surfaceVal, {
        label: String(surfaceVal),
        updatedAt: nowIso,
      })
    : null;

  const weatherLabel = race.weather || context.weatherBundle?.label || "";
  const weatherNode = weatherLabel
    ? safeAddNode(NODE_TYPE.WEATHER, weatherLabel, {
        label: weatherLabel,
        updatedAt: context.weatherBundle?.fetchedAt || nowIso,
        props: { reliability: 80, importance: 65 },
      })
    : null;

  const trackLabel =
    race.trackCondition || context.weatherBundle?.trackCondition || "";
  const trackNode = trackLabel
    ? safeAddNode(NODE_TYPE.TRACK, trackLabel, {
        label: trackLabel,
        updatedAt: context.weatherBundle?.fetchedAt || nowIso,
        props: { reliability: 82, importance: 66 },
      })
    : null;

  const stageNode = safeAddNode(NODE_TYPE.ANALYSIS_STAGE, `S${stage}`, {
    label: `Stage${stage}`,
    updatedAt: nowIso,
    props: { stage },
  });

  if (raceNode && weatherNode) {
    safeAddEdge(EDGE_TYPE.RACE_WEATHER, raceNode.id, weatherNode.id, {
      weight: 1.2,
    });
  }
  if (raceNode && trackNode) {
    safeAddEdge(EDGE_TYPE.RACE_TRACK, raceNode.id, trackNode.id, {
      weight: 1.2,
    });
  }
  if (raceNode && stageNode) {
    safeAddEdge(EDGE_TYPE.RACE_STAGE, raceNode.id, stageNode.id);
  }

  // --- Horses + relations ---
  for (const h of horses) {
    const name = h.horse || h.horseName || `H${h.number}`;
    const horseNode = safeAddNode(NODE_TYPE.HORSE, name, {
      label: name,
      updatedAt: nowIso,
      props: {
        number: h.number,
        importance: Number(h.thinking?.score) || Number(h.indexes?.total) || 60,
        reliability: 78,
      },
    });
    if (!horseNode) continue;

    if (raceNode) {
      safeAddEdge(EDGE_TYPE.HORSE_RACE, horseNode.id, raceNode.id);
    }

    const jockeyName =
      typeof h.jockey === "object" ? h.jockey?.name : h.jockey;
    if (jockeyName) {
      const jn = safeAddNode(NODE_TYPE.JOCKEY, jockeyName, {
        label: jockeyName,
        updatedAt: nowIso,
      });
      if (jn) safeAddEdge(EDGE_TYPE.HORSE_JOCKEY, horseNode.id, jn.id);
    }

    const trainerName =
      typeof h.trainer === "object" ? h.trainer?.name : h.trainer;
    if (trainerName) {
      const tn = safeAddNode(NODE_TYPE.TRAINER, trainerName, {
        label: trainerName,
        updatedAt: nowIso,
      });
      if (tn) safeAddEdge(EDGE_TYPE.HORSE_TRAINER, horseNode.id, tn.id);
    }

    if (courseNode) {
      safeAddEdge(EDGE_TYPE.HORSE_RACECOURSE, horseNode.id, courseNode.id);
    }
    if (distNode) {
      safeAddEdge(EDGE_TYPE.HORSE_DISTANCE, horseNode.id, distNode.id);
    }
    if (surfaceNode) {
      safeAddEdge(EDGE_TYPE.HORSE_SURFACE, horseNode.id, surfaceNode.id);
    }
    if (weatherNode) {
      safeAddEdge(EDGE_TYPE.HORSE_WEATHER, horseNode.id, weatherNode.id);
    }

    // Odds node per horse
    const oddsVal =
      typeof h.odds === "object" ? h.odds?.win : h.odds;
    if (oddsVal != null) {
      const on = safeAddNode(
        NODE_TYPE.ODDS,
        `${name}:${oddsVal}`,
        {
          label: `${name} ${oddsVal}倍`,
          updatedAt: context.oddsBundle?.fetchedAt || nowIso,
          props: {
            win: Number(oddsVal),
            popularity:
              typeof h.popularity === "object"
                ? h.popularity?.value
                : h.popularity,
            reliability: 84,
            importance: 72,
          },
        }
      );
      if (on) {
        safeAddEdge(EDGE_TYPE.HORSE_ODDS, horseNode.id, on.id, {
          weight: 1.1,
        });
        if (raceNode) {
          safeAddEdge(EDGE_TYPE.RACE_ODDS, raceNode.id, on.id, {
            weight: 0.8,
          });
        }
      }
    }
  }

  // --- Entry ---
  const entries = context.entryBundle?.entries || [];
  for (const e of entries) {
    const name = e.horse || e.horseName || `E${e.number}`;
    const en = safeAddNode(NODE_TYPE.ENTRY, `${name}:${e.entryStatus || "in"}`, {
      label: `${name} (${e.entryStatus || "entry"})`,
      updatedAt: context.entryBundle?.fetchedAt || nowIso,
      props: {
        status: e.entryStatus,
        reliability: 92,
        importance: 74,
      },
    });
    if (en && raceNode) {
      safeAddEdge(EDGE_TYPE.RACE_ENTRY, raceNode.id, en.id);
    }
  }

  // --- Draw (aggregate) ---
  if (context.drawBundle?.ok) {
    safeAddNode(NODE_TYPE.DRAW, `draw:${raceKey}`, {
      label: `Draw Stage${context.drawBundle.confirmedStage ?? "—"}`,
      updatedAt: context.drawBundle.fetchedAt || nowIso,
      props: {
        stage: context.drawBundle.confirmedStage,
        reliability: 88,
        importance: 70,
      },
    });
  }

  // --- News ---
  for (const n of context.newsBundle?.items || []) {
    const nn = safeAddNode(NODE_TYPE.NEWS, n.id || n.title, {
      label: n.title || n.categoryLabel || n.id,
      updatedAt: n.updatedAt || context.newsBundle?.fetchedAt || nowIso,
      props: {
        category: n.category,
        reliability: n.reliabilityScore ?? 62,
        importance: n.importanceScore ?? 60,
        horses: n.horses || [],
      },
    });
    if (!nn) continue;
    for (const hn of n.horses || []) {
      const horseN = listNodes({ type: NODE_TYPE.HORSE }).find(
        (x) => x.label === hn || x.key === hn
      );
      if (horseN) {
        safeAddEdge(EDGE_TYPE.HORSE_NEWS, horseN.id, nn.id);
      }
    }
  }

  // --- Social ---
  for (const s of context.socialBundle?.trends?.items ||
    context.socialBundle?.aiSocial?.topics ||
    []) {
    const sn = safeAddNode(NODE_TYPE.SOCIAL, s.id || s.category, {
      label: s.categoryLabel || s.category || s.id,
      updatedAt: s.updatedAt || context.socialBundle?.fetchedAt || nowIso,
      props: {
        category: s.category,
        postCount: s.postCount,
        reliability: s.reliability ?? 52,
        importance: s.importance ?? 55,
        horses: s.horses || [],
      },
    });
    if (!sn) continue;
    for (const hn of s.horses || []) {
      const horseN = listNodes({ type: NODE_TYPE.HORSE }).find(
        (x) => x.label === hn || x.key === hn
      );
      if (horseN) {
        safeAddEdge(EDGE_TYPE.HORSE_SOCIAL, horseN.id, sn.id);
      }
    }
  }

  // --- Discussion / Evidence ---
  const discussion = context.discussionBundle || context.discussion;
  let discussionNode = null;
  if (discussion?.ok) {
    discussionNode = safeAddNode(NODE_TYPE.DISCUSSION, `disc:${raceKey}`, {
      label: discussion.status?.label || "Discussion",
      updatedAt: discussion.fetchedAt || nowIso,
      props: {
        consensus: discussion.consensus?.consensusScore,
        conflict: discussion.consensus?.conflictScore,
        finalConfidence: discussion.consensus?.finalConfidence,
        reliability: 74,
        importance: 78,
      },
    });
    if (discussionNode && raceNode) {
      safeAddEdge(EDGE_TYPE.RACE_DISCUSSION, raceNode.id, discussionNode.id);
    }

    for (const ev of discussion.evidence || []) {
      const en = safeAddNode(NODE_TYPE.EVIDENCE, ev.id, {
        label: ev.claim || ev.id,
        updatedAt: ev.updatedAt || nowIso,
        props: {
          source: ev.source,
          claimType: ev.claimType,
          polarity: ev.polarity,
          reliability: ev.scores?.reliability,
          importance: ev.scores?.importance,
          horses: ev.horseNames || [],
        },
      });
      if (!en) continue;
      if (discussionNode) {
        safeAddEdge(
          EDGE_TYPE.DISCUSSION_EVIDENCE,
          discussionNode.id,
          en.id,
          { weight: (ev.scores?.confidence || 50) / 50 }
        );
      }
      for (const hn of ev.horseNames || []) {
        const horseN = listNodes({ type: NODE_TYPE.HORSE }).find(
          (x) => x.label === hn || x.key === hn
        );
        if (horseN) {
          safeAddEdge(EDGE_TYPE.HORSE_EVIDENCE, horseN.id, en.id);
        }
      }
    }
  }

  // --- Explain / Reason / Confidence / Prediction ---
  const explain = context.explainBundle || context.explain;
  let predictionNode = null;
  if (explain?.ok) {
    predictionNode = safeAddNode(NODE_TYPE.PREDICTION, `pred:${raceKey}`, {
      label: "Prediction",
      updatedAt: explain.fetchedAt || nowIso,
      props: {
        top:
          (context.ranked || []).slice(0, 3).map((h) => h.horse || h.horseName),
        reliability: 70,
        importance: 82,
      },
    });
    if (predictionNode && raceNode) {
      safeAddEdge(EDGE_TYPE.RACE_PREDICTION, raceNode.id, predictionNode.id);
    }

    const conf = explain.confidenceExplainer || {};
    const confNode = safeAddNode(
      NODE_TYPE.CONFIDENCE,
      `conf:${raceKey}`,
      {
        label: `Confidence ${conf.finalConfidence ?? "—"}`,
        updatedAt: nowIso,
        props: {
          finalConfidence: conf.finalConfidence,
          reliability: 72,
          importance: 72,
        },
      }
    );
    if (predictionNode && confNode) {
      safeAddEdge(
        EDGE_TYPE.PREDICTION_CONFIDENCE,
        predictionNode.id,
        confNode.id
      );
    }

    const reasons = [
      explain.reasons?.overall,
      ...(explain.reasons?.plus || []),
      ...(explain.reasons?.minus || []),
    ].filter(Boolean);

    reasons.forEach((r, idx) => {
      const rn = safeAddNode(NODE_TYPE.REASON, `reason:${raceKey}:${idx}`, {
        label: (r.text || "").slice(0, 80),
        updatedAt: nowIso,
        props: {
          type: r.type,
          evidenceId: r.evidenceId,
          importance: 70,
          reliability: 70,
        },
      });
      if (!rn) return;
      if (predictionNode) {
        safeAddEdge(EDGE_TYPE.PREDICTION_REASON, predictionNode.id, rn.id);
      }
      if (r.evidenceId) {
        const evNode = listNodes({ type: NODE_TYPE.EVIDENCE }).find(
          (n) =>
            n.key === r.evidenceId ||
            n.id === r.evidenceId ||
            n.id === `Evidence:${r.evidenceId}`
        );
        if (evNode) {
          safeAddEdge(EDGE_TYPE.REASON_EVIDENCE, rn.id, evNode.id);
        }
      }
    });
  }

  // --- Learning ---
  const learning = context.learningDashboard;
  if (learning?.dbMeta?.recordCount > 0 || (learning?.recent || []).length) {
    const ln = safeAddNode(NODE_TYPE.LEARNING, `learn:${raceKey}`, {
      label: `Learning ${learning.dbMeta?.recordCount ?? 0}`,
      updatedAt: learning.dbMeta?.updatedAt || nowIso,
      props: {
        recordCount: learning.dbMeta?.recordCount,
        hitRate: learning.performance?.hitRate,
        reliability: 68,
        importance: 68,
      },
    });
    if (ln) {
      for (const h of horses.slice(0, 5)) {
        const name = h.horse || h.horseName;
        const horseN = listNodes({ type: NODE_TYPE.HORSE }).find(
          (x) => x.label === name
        );
        if (horseN) {
          safeAddEdge(EDGE_TYPE.HORSE_LEARNING, horseN.id, ln.id, {
            weight: 0.7,
          });
        }
      }
    }
  }

  const graphValidation = validateGraph(listNodes(), listEdges());
  rebuildIndex();
  scoreGraphNodes();
  const knowledgeScore = aggregateKnowledgeScore();

  syncState = {
    status: graphValidation.ok ? "ok" : "degraded",
    lastAt: new Date().toISOString(),
    nodeCount: listNodes().length,
    edgeCount: listEdges().length,
    rejected: syncState.rejected,
    message: graphValidation.ok
      ? "Knowledge Graph synced"
      : `Validation warnings/errors: e${graphValidation.errors.length}/w${graphValidation.warnings.length}`,
    validation: graphValidation,
    knowledgeScore,
  };

  return {
    ok: graphValidation.ok || listNodes().length > 0,
    sync: getSyncState(),
    validation: graphValidation,
    nodeCount: syncState.nodeCount,
    edgeCount: syncState.edgeCount,
    knowledgeScore,
    updatedAt: syncState.lastAt,
  };
}

export const KnowledgeSynchronizer = {
  sync: syncKnowledgeGraph,
  state: getSyncState,
};
