# PAPAPA IQ KEIBA

**Ver7.8.0** — Odds & Market Intelligence

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
オッズ・人気・市場動向を取得し、AI分析の**補助要素**として反映します。  
ニュース・SNS・レース後レビューは本バージョンの対象外です。

## Odds Engine

```
services/odds/
  OddsManager
  OddsRepository
  OddsSynchronizer
  OddsValidator
  OddsHistoryManager
  MarketAnalyzer
```

### 取得対象

単勝オッズ・複勝オッズ・人気順位・更新時刻・オッズ変動履歴・市場指数

### Market Intelligence

| Score | 意味 |
|-------|------|
| Market Score | 市場注目度 |
| Support Score | 複勝側の支持 |
| Value Score | 期待値（人気順依存にしない） |

過剰人気 / 過小評価 / 期待値あり をラベル化します。

### Analysis Stage

| Stage | 内容 |
|-------|------|
| 6 | 前日情報 → オッズ反映 |
| 7 | 当日最終分析 → 最新オッズ反映 |

### Validation / Synchronization

オッズ異常・人気重複・欠損・型を検証。失敗データは AI へ渡しません。  
オッズ更新・人気変動・市場指数更新時のみ Smart Update 再分析します。

### Data Completeness

オッズ / 人気 / 市場情報の取得率を表示。ニュース・SNSは **0%**。Overall を Confidence へ反映します。

## Draw & Entry（維持）

- Ver7.7 Draw & Jockey（枠・騎手・斤量）
- Ver7.6 Horse Entry（登録〜出走予定）

## 確認方法

```bash
python -m http.server 5500
```

1. 分析画面「取得済み: 人気・オッズ・市場情報」  
2. Odds Completeness / Dev Panel「Odds & Market」  
3. Mock Events のオッズ系で変更なしスキップを確認  

## 維持機能

Ver7.7 Draw & Jockey Intelligence までの全機能を維持しています。
