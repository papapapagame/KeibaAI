# PAPAPA IQ KEIBA

**Ver7.1.0** — Race Calendar Intelligence

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
開催日・開催場・分析段階（Analysis Stage）を AI が理解する仕組みです。Mock カレンダーで動作します。

## Race Calendar Intelligence

```
services/calendar/
  race-calendar-engine.js
  race-date-manager.js
  venue-manager.js
  race-session-manager.js
  calendar-validator.js
  stage-evaluation.js
  models.js
```

### 開催日カレンダー

- 開催日のみ選択可（非開催日はグレーアウト）
- 過去・未来の開催日に対応
- Mock / Real 切替（Real は Provider未接続）

### 開催場自動切替

日付選択後、その日の開催場のみ表示（例: 2026/07/26 → 札幌・新潟・中京）

### Analysis Stage（Stage0〜7）

開催決定 → 特別登録 → 出走予定 → 枠順 → 騎手 → 斤量 → 前日 → 当日最終  

未確定情報は確定として扱いません（入力サニタイズ後に AI へ渡す）。

### Unified Calendar Model

RaceDate / RaceVenue / RaceSession / AnalysisStage / DataCompleteness

### 画面

- `index.html` — カレンダー UI・開催情報・Calendar Dev Panel  
- `analysis.html` — Stage / Confidence / Completeness / AI通知  

## データフロー（維持）

Ver7.0 Data Platform: Provider → Normalizer → Validator → Cache → Unified Model → AI

## 確認方法

```bash
python -m http.server 5500
```

1. トップで開催日のみ選択できること  
2. 2026-07-26 選択で札幌・新潟・中京のみ出ること  
3. 分析画面で Stage / 暫定評価通知を確認  
