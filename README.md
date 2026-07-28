# PAPAPA IQ KEIBA

**Ver6.5.0** — AI Race Review & Knowledge Learning

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
レース終了後の公開情報を AI が考察し、Knowledge Base へ蓄積します。記事・SNS本文は表示しません。

## AI Race Review

```
services/review/
  race-review-engine.js      # RaceReviewEngine
  winner-analyzer.js         # WinnerAnalyzer
  loser-analyzer.js          # LoserAnalyzer
  race-flow-analyzer.js      # RaceFlowAnalyzer
  knowledge-manager.js       # KnowledgeManager
  lesson-generator.js        # LessonGenerator
  future-prediction-manager.js
  explain-review.js
  review-sources.js
  learning-bridge.js
  review-dashboard.js
```

### Review Flow

1. 公開情報ソースを統合（JRA結果・ラップ・払戻・馬場・天候・調教・ニュース要約・騎手/調教師コメント要約・X市場反応・専門家要約）  
2. RaceFlow / Winner / Loser 分析  
3. Lessons Learned 生成  
4. Future Watch List 選出  
5. Horse AI Memo 追記  
6. Explain Review（結論＋なぜ）  
7. Knowledge Base へ保存  
8. Learning AI へ引き渡し可能なペイロードを生成（ロジック非改変）

### Knowledge Base

保存キー: `papapa_iq_review_kb_v65`  

Race ID / Horse ID / Review / Lessons / Horse Memo / Winner・Loser Analysis / Future Watch / Version / Timestamp  

将来の SQLite・クラウド DB 移行を想定した JSON ドキュメント構造です。

### Lesson System

毎レース「今回学んだこと」を生成し Knowledge に蓄積。ペース・馬場・市場過熱・予想差異などを言語化します。

### Horse Memo

馬ごとにタグ付き AI メモ（例: 終い優秀、重馬場苦手、過熱注意）を追記可能。

### 画面

`review.html` — Review Dashboard（最新レビュー / Lessons / 注目馬 / 危険人気 / Knowledge件数 / 履歴）

### Learning 連携

`buildLearningHandoff()` → `acceptReviewHandoff()`  
Review 考察を Learning 履歴へ渡せます。重み・評価ロジックの自動書換は行いません。

## Ver6.0 Betting Intelligence（維持）

`ticket.html` / `services/betting/` — 券種横断の買い目提案。

## 確認方法

```bash
python -m http.server 5500
```

1. `review.html` で Dashboard・Explain・Lessons を確認  
2. 「Learningへ引き渡し」で履歴連携  
3. 記事本文が出ていないことを確認  
