# PAPAPA IQ KEIBA

**Ver8.3.0** — Prediction Explainability

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
AI 予想の根拠は **Discussion Engine の採用／除外 Evidence** のみを基に説明します（推測で理由を作りません）。

## Prediction Explainability

```
services/explain/
  ExplainManager
  PredictionExplainer
  EvidenceExplainer
  ReasonBuilder
  ContributionAnalyzer
  ConfidenceExplainer
  ExplanationValidator
```

### Contribution Analysis

能力評価 / 近走成績 / 距離適性 / コース適性 / 馬場適性 / 枠順 / 騎手 / 斤量 / オッズ / 市場情報 / 天候 / ニュース / SNS / Learning  

寄与率合計は **100%**（largest remainder 法）。

### Reason Builder

総合評価理由・各馬の評価理由・加点／減点・採用／除外 Evidence・Confidence 理由・Analysis Stage 影響を生成します。

### Prediction Diff

前回分析との順位変動・Confidence 変化・新規／除外 Evidence・重要変更点を保持します。

### Confidence Explanation

Discussion の Consensus / Agreement / Conflict / Final Confidence と Stage から理由を説明します。

### Validation

寄与率合計100%・Evidence整合・Reason欠損・Confidence整合を検証。異常データは表示しません。

### Unified Model

`Explain` / `Contribution` / `PredictionDiff` / `Reason` / `Evidence` / `Confidence` を統合。AI は Unified Model のみ参照します。

## Discussion / Social / News（維持）

Ver8.2 Discussion・Ver8.1 Social・Ver8.0 News を維持しています。

## 確認方法

```bash
python -m http.server 5500
```

1. 分析画面「総合評価理由 / 重要な根拠 / 寄与率 / Confidence理由 / Stage / 差分」  
2. Dev Panel「Contribution / Evidence / Reason / Diff / Validation」  
3. 寄与率合計が100%、説明が Discussion 根拠に紐づくこと  

## 維持機能

Ver8.2 までの全機能を維持しています。
