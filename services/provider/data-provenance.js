/* ========================================
   Data Provenance — Ver7.4
   取得元・取得日時・Provider Version・状態
   ======================================== */

import { PROVIDER_VERSION } from "./provider-interface.js";

export function createProvenance({
  providerId,
  providerVersion = PROVIDER_VERSION,
  fetchedAt = new Date().toISOString(),
  status = "ok",
  health = "UNKNOWN",
  latencyMs = null,
  sourceLabel = null,
  failoverFrom = null,
  mergeSources = null,
} = {}) {
  return {
    providerId: providerId || "unknown",
    providerVersion,
    fetchedAt,
    status,
    health,
    latencyMs,
    sourceLabel: sourceLabel || providerId || "unknown",
    failoverFrom: failoverFrom || null,
    mergeSources: mergeSources || null,
    frameworkVersion: PROVIDER_VERSION,
  };
}

export function attachProvenance(payload, provenance) {
  if (payload == null) return payload;
  if (Array.isArray(payload)) {
    return payload.map((item) => attachProvenance(item, provenance));
  }
  if (typeof payload !== "object") return payload;
  return {
    ...payload,
    _provenance: provenance,
  };
}

export function extractProvenance(payload) {
  if (!payload || typeof payload !== "object") return null;
  return payload._provenance || null;
}

export const DataProvenance = {
  create: createProvenance,
  attach: attachProvenance,
  extract: extractProvenance,
};
