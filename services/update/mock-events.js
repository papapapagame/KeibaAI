/* ========================================
   Mock Events catalog — Ver7.2
   ======================================== */

export const MOCK_EVENTS = [
  {
    type: "frame_confirmed",
    label: "枠順確定",
    detail: "枠順が正式発表",
    payload: { field: "frame" },
  },
  {
    type: "jockey_change",
    label: "騎手変更",
    detail: "7番 騎手変更",
    payload: { number: 7 },
  },
  {
    type: "scratched",
    label: "出走取消",
    detail: "12番 出走取消",
    payload: { number: 12 },
  },
  {
    type: "excluded",
    label: "除外",
    detail: "3番 除外",
    payload: { number: 3 },
  },
  {
    type: "weight_change",
    label: "斤量変更",
    detail: "斤量 +1kg",
    payload: { number: 5, delta: 1 },
  },
  {
    type: "track_change",
    label: "馬場状態変更",
    detail: "良 → 稍重",
    payload: { from: "良", to: "稍重" },
  },
  {
    type: "weather_change",
    label: "天候変化",
    detail: "晴 → 雨",
    payload: { from: "晴", to: "雨" },
  },
  {
    type: "odds_spike",
    label: "オッズ急変",
    detail: "1番人気 2.8→4.6",
    payload: { number: 1 },
  },
  {
    type: "meeting_update",
    label: "開催情報更新",
    detail: "発走時刻変更",
    payload: {},
  },
  {
    type: "provider_update",
    label: "Provider更新",
    detail: "Mock Provider 差分",
    payload: {},
  },
  {
    type: "news_added",
    label: "ニュース追加",
    detail: "レース関連ニュース要約追加",
    payload: {},
  },
  {
    type: "stage_changed",
    label: "Stage変化",
    detail: "Stage3 → Stage4",
    payload: { from: 3, to: 4 },
  },
];

export function getMockEventCatalog() {
  return MOCK_EVENTS.map((e) => ({
    type: e.type,
    label: e.label,
    detail: e.detail,
  }));
}
