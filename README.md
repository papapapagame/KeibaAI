# PAPAPA IQ KEIBA

**Ver5.5.0** — Learning AI Engine（自己学習基盤）

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
このバージョンでは AI が予想ロジックを自動書き換えません。結果の蓄積・分析・重み管理・改善提案までを実装しています。

## Learning AI Engine

```
services/learning/
  learning-engine.js      … オーケストレータ
  result-analyzer.js      … 結果と予想の差分
  accuracy-tracker.js     … Analyzer精度
  performance-analyzer.js … 成績集計
  weight-optimizer.js     … 重み管理（手動 / 提案のみ）
  learning-history.js     … 履歴
  learning-db.js          … localStorage DB
  explain-learning.js     … 学習理由の説明
```

### Learning Flow

1. 分析画面で予想スナップショットを Learning DB へ保存  
2. 結果登録時に ResultAnalyzer が差分を算出  
3. Accuracy / Performance を更新  
4. WeightOptimizer が提案を生成（**自動適用しない**）  
5. Explain Learning が「なぜ学習したか」を表示  
6. Ver6.0 で安全に重み反映できる構造を維持  

### Analyzer評価

Horse / Race / Odds / History / Trend / Market ごとに命中率・順位誤差・EV・回収・信頼度。

### Weight構造

Analyzer別重みを localStorage で管理。LearningEngine 重みは Ver5.5 では 0 固定。

### Learning DB

localStorage（`papapa_iq_learning_ai_v55`）。将来 SQLite / クラウドへ移行しやすい JSON スキーマ。  
AI Engine Version / Learning Version / Timestamp を保存。

## AI Performance 画面

`performance.html` — 総レース・的中率・回収率・ROI・Analyzerランキング・Dashboard・Explain Learning・Weight Optimizer。

## 確認方法

```bash
python -m http.server 5500
```

1. `performance.html` でデモ学習データを確認  
2. AI分析実行後、Learning DB に予想が追加されること  
3. 既存の新聞・Market・Intelligence 機能が従来どおり動くこと
