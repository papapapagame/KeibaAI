/* ========================================
   Update Priority — Ver7.2
   ======================================== */

export const UPDATE_PRIORITY = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

/** イベント種別 → 優先度 */
export const EVENT_PRIORITY_MAP = {
  frame_confirmed: UPDATE_PRIORITY.CRITICAL,
  jockey_change: UPDATE_PRIORITY.CRITICAL,
  scratched: UPDATE_PRIORITY.CRITICAL,
  excluded: UPDATE_PRIORITY.CRITICAL,
  weight_change: UPDATE_PRIORITY.HIGH,
  track_change: UPDATE_PRIORITY.HIGH,
  weather_change: UPDATE_PRIORITY.HIGH,
  wind_speed_change: UPDATE_PRIORITY.HIGH,
  wind_direction_change: UPDATE_PRIORITY.MEDIUM,
  moisture_updated: UPDATE_PRIORITY.MEDIUM,
  odds_spike: UPDATE_PRIORITY.MEDIUM,
  odds_updated: UPDATE_PRIORITY.MEDIUM,
  popularity_changed: UPDATE_PRIORITY.MEDIUM,
  market_index_updated: UPDATE_PRIORITY.MEDIUM,
  meeting_update: UPDATE_PRIORITY.MEDIUM,
  provider_update: UPDATE_PRIORITY.MEDIUM,
  news_added: UPDATE_PRIORITY.MEDIUM,
  news_updated: UPDATE_PRIORITY.MEDIUM,
  news_scratch: UPDATE_PRIORITY.HIGH,
  news_important: UPDATE_PRIORITY.HIGH,
  social_topic_added: UPDATE_PRIORITY.MEDIUM,
  social_spike: UPDATE_PRIORITY.HIGH,
  social_important: UPDATE_PRIORITY.HIGH,
  social_trend_change: UPDATE_PRIORITY.MEDIUM,
  stage_changed: UPDATE_PRIORITY.CRITICAL,
  schedule_tick: UPDATE_PRIORITY.MEDIUM,
  entry_added: UPDATE_PRIORITY.HIGH,
  entry_scratched: UPDATE_PRIORITY.CRITICAL,
  entry_status_changed: UPDATE_PRIORITY.HIGH,
};

/** 優先度ごとの再分析遅延（ms）— Critical は即時 */
export const PRIORITY_DELAY_MS = {
  [UPDATE_PRIORITY.CRITICAL]: 0,
  [UPDATE_PRIORITY.HIGH]: 2 * 60 * 1000,
  [UPDATE_PRIORITY.MEDIUM]: 10 * 60 * 1000,
  [UPDATE_PRIORITY.LOW]: null, // 次回スケジュール時
};

export function priorityOf(eventType) {
  return EVENT_PRIORITY_MAP[eventType] || UPDATE_PRIORITY.LOW;
}

export function delayForPriority(priority) {
  return PRIORITY_DELAY_MS[priority] ?? null;
}

export function reasonForEvent(eventType, detail = "") {
  const map = {
    frame_confirmed: "枠順が確定したため再分析しました。",
    jockey_change: "騎手変更を検知したため再評価しました。",
    scratched: "出走取消を検知したため再分析しました。",
    excluded: "除外を検知したため再分析しました。",
    weight_change: "斤量変更を検知したため再評価しました。",
    track_change: "馬場状態が変更されたため補正しました。",
    weather_change: "天候変化を検知したため補正しました。",
    wind_speed_change: "風速変化を検知したため補正しました。",
    wind_direction_change: "風向変化を検知したため補正しました。",
    moisture_updated: "含水率更新を検知したため補正しました。",
    odds_spike: "オッズ急変を検知したため再分析しました。",
    odds_updated: "オッズ更新を検知したため再分析しました。",
    popularity_changed: "人気順位変動を検知したため再分析しました。",
    market_index_updated: "市場指数更新を検知したため再分析しました。",
    meeting_update: "開催情報が更新されたため再分析しました。",
    provider_update: "Provider更新を検知したため再取得・再分析しました。",
    news_added: "新着ニュース（メタデータ）を検知したため再分析しました。",
    news_updated: "ニュース更新を検知したため再分析しました。",
    news_scratch: "取消情報ニュースを検知したため再分析しました。",
    news_important: "重要ニュース追加を検知したため再分析しました。",
    social_topic_added: "新規SNS話題（メタデータ）を検知したため再分析しました。",
    social_spike: "SNS投稿急増を検知したため再分析しました。",
    social_important: "重要SNSカテゴリ追加を検知したため再分析しました。",
    social_trend_change: "SNSトレンド変化を検知したため再分析しました。",
    stage_changed: "Analysis Stage が変化したため自動再分析しました。",
    schedule_tick: "スケジュール更新タイミングのため再分析しました。",
    entry_added: "登録馬追加を検知したため再取得しました。",
    entry_scratched: "登録取消を検知したため再分析しました。",
    entry_status_changed: "出走予定変更を検知したため再取得しました。",
  };
  const base = map[eventType] || "データ更新を検知したため再分析しました。";
  return detail ? `${base}（${detail}）` : base;
}
