/* ========================================
   Tip-site / Provider Market Adapter — Ver5.4
   取得内容は表示せず AI 解析専用
   ======================================== */

const TIP_PROVIDERS = [
  { id: "jra", label: "JRA公式" },
  { id: "netkeiba", label: "netkeiba" },
  { id: "jbis", label: "JBIS" },
  { id: "keibalab", label: "競馬ラボ" },
  { id: "umax", label: "ウマークス" },
  { id: "umanity", label: "ウマニティ" },
];

/**
 * Intelligence Provider 状態から Market 用メタのみ生成。
 * サイト本文・予想文は一切保持しない。
 */
export function analyzeTipSites(context = {}) {
  const providers = context.intelPacket?.providers || [];
  const byId = new Map(providers.map((p) => [p.providerId, p]));
  const started = Date.now();

  const rows = TIP_PROVIDERS.map((meta) => {
    const runtime = byId.get(meta.id);
    const implemented = Boolean(runtime && runtime.implemented !== false && (runtime.count || 0) >= 0);
    // JRA may be ONLINE with counts; tip content still not displayed
    const status =
      runtime?.status ||
      (meta.id === "jra" ? "READY" : "OFFLINE");
    return {
      id: meta.id,
      label: meta.label,
      status,
      fetchedCount: runtime?.count || 0,
      // 解析はメタ件数のみ。コンテンツなし。
      analyzedCount: runtime?.count ? 1 : 0,
      aiOnly: true,
      displayContent: false,
      note:
        meta.id === "jra"
          ? "Official-shaped feed metrics only"
          : "TODO: connect provider for AI-only signals",
    };
  });

  const active = rows.filter((r) => r.status === "ONLINE" || r.fetchedCount > 0);

  return {
    analyzer: "TipSiteAnalyzer",
    status: active.length ? "ONLINE" : "READY",
    providers: rows,
    fetchedCount: rows.reduce((s, r) => s + r.fetchedCount, 0),
    analyzedCount: active.length,
    responseMs: Date.now() - started,
    updatedAt: new Date().toISOString(),
    note: "Tip-site raw content is never displayed",
  };
}
