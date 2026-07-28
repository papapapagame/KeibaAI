# PAPAPA IQ KEIBA

**Ver8.4.0** — Knowledge Graph

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
Knowledge Graph は **AI 内部推論・検索・関連性分析の基盤** です（表示用DBではありません）。

## Knowledge Graph

```
services/knowledge/
  KnowledgeGraphManager
  KnowledgeNodeManager
  KnowledgeEdgeManager
  KnowledgeIndexer
  KnowledgeQueryEngine
  KnowledgeValidator
  KnowledgeSynchronizer
```

### Node

Horse / Race / Jockey / Trainer / Racecourse / Entry / Draw / Odds / Weather / Track / News / Social / Evidence / Discussion / Reason / Learning / Prediction / AnalysisStage ほか

### Edge

Horse→Race/Jockey/Trainer/Racecourse/Distance/Surface/Weather/Odds/News/Social/Evidence/Learning  
Race→Weather/Track/Odds/Entry  
Discussion→Evidence / Reason→Evidence / Prediction→Reason/Confidence

### Query Engine

関連 Node / Edge、履歴検索、近似検索、関連度検索、重要度検索、馬コンテキスト取得

### Graph Intelligence

各 Node に Importance / Reliability / Freshness / Connectivity / Knowledge Score を付与

### Indexer / Synchronization / Validation

Indexer で型・ラベル・隣接を索引化。  
Synchronizer が各 Engine データを統合同期。  
Node/Edge 重複・欠損・孤立・循環を検証し、失敗データは Graph へ登録しません。

### AI 利用

Discussion / Explainability / Learning / Prediction は Knowledge Graph 経由で関連情報を取得します。

### Unified Model

`KnowledgeGraph` / `KnowledgeNode` / `KnowledgeEdge` を統合。AI は Unified Model のみ参照します。

## Explain / Discussion（維持）

Ver8.3 Explainability・Ver8.2 Discussion ほか全機能を維持しています。

## 確認方法

```bash
python -m http.server 5500
```

1. 分析画面「Knowledge Status / Node数 / Edge数 / Knowledge Score / 更新時刻」  
2. Dev Panel「Indexer / Query / Validation / Synchronization」  
3. Console で `aiInput.knowledgeGraph` が推論用に注入されること  

## 維持機能

Ver8.3 までの全機能を維持しています。
