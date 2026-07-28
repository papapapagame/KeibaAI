# PAPAPA IQ KEIBA

**Ver7.3.0** — Race & Horse Data Integration

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
Race / Horse / Jockey / Trainer の共通モデルを完成し、AI は Provider を直接参照しません。

## Race Engine / Horse Engine

```
services/race/     RaceDataManager, Repository, Mapper, Validator, Formatter, State
services/horse/    HorseManager, Repository, Mapper, History, Condition, Validator
services/models/unified.js
```

### Unified Model

Race / Horse / Jockey / Trainer / Venue / Distance / Surface / Frame / Weight / Odds / Popularity / Result / AnalysisStage / LearningData / Knowledge / Review

### Data Mapping

JRA / netkeiba / JBIS / Mock それぞれの生データを同一 RaceModel / HorseModel へ変換。

### Validation

必須・重複・型・欠損・異常値を検証。異常データは AI へ渡しません。

### Data Completeness

Race / Horse / Odds / Market / Overall を算出し、Confidence 表示へ利用（評価ロジック非改変）。

### AI連携フロー

```
Provider → RaceRepository
  → Mapper → Validator
  → RaceDataManager
  → Unified Model
  → AI
```

### 画面

`analysis.html` — Data Status（〇△×） / Completeness / Dev Panel（Mapping・Validation）

## 確認方法

```bash
python -m http.server 5500
```

1. 分析画面で取得済みマークと Completeness を確認  
2. Dev Panel の Mapping / Validation  
3. Mock / Real 切替（Real は Provider未接続）  

## 維持機能

Ver7.2 Smart Update までの全機能を維持しています。
