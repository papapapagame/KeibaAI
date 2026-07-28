# PAPAPA IQ KEIBA

**Ver7.5.0** — Race Data Connect

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
開催日・開催場・レース一覧・レース基本情報の接続基盤です（Horse / Odds は対象外）。

## Race Data Connect

```
services/race-connect/
  RaceDataConnector / Fetcher / Parser
  RaceDataSynchronizer / Monitor
```

### 取得フロー

```
Provider Framework
  → RaceDataFetcher
  → Parser（Normalizer）
  → Validator
  → Unified Model
  → AI / Calendar
```

AI・画面は Provider へ直接アクセスしません。

### 取得項目

開催日 / 開催場 / 開催回 / 開催日数 / レース番号 / レース名 / 発走時刻 / 距離 / 芝・ダート / 右左 / 内外 / 天候 / 馬場 / グレード / 条件戦区分 / 賞金

### Provider連携

Mock / Real / Auto 切替。Mock は既存 JSON、Real は Provider Framework 経由（未接続時はブロック）。

### Validation

必須・型・重複・異常値・欠損を検証。失敗時は AI へ渡しません。

### Synchronization

取得した開催日・開催場を Race Calendar へ反映。  
Smart Update は開催更新時に Race のみ再取得し、変更が無ければ AI 再分析しません。

## 確認方法

```bash
python -m http.server 5500
```

1. 分析画面「Race Data Connect」ステータス  
2. Dev Panel の成功/失敗/同期/最終更新  
3. Mock / Real / Auto 切替  

## 維持機能

Ver7.4 Provider Framework までの全機能を維持しています。
