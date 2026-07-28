# PAPAPA IQ KEIBA

**Ver8.2.0** — AI Discussion Engine

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
各データソースの評価を独立 Evidence として収集し、**単純な平均・加算ではなく**信頼度・鮮度・重要度・取得率・一致／矛盾を比較して最終判断します。

## AI Discussion Engine

```
services/discussion/
  DiscussionManager
  DiscussionEngine
  EvidenceCollector
  ConflictResolver
  ConsensusEngine
  ReasoningBuilder
  DiscussionValidator
```

### Evidence

収集対象: Horse / Race / Entry / Draw / Odds / Weather / News / Social / Learning  

各 Evidence に Confidence / Freshness / Reliability / Coverage / Importance を付与します。

### Conflict Resolution

同一主張タイプで矛盾した場合、信頼度・更新時刻・重要度・取得率を比較して採用／除外を決定します。

### Consensus Engine

| Score | 意味 |
|-------|------|
| Consensus Score | 合意度（上位 Evidence の質を重視） |
| Agreement Score | 一致度 |
| Conflict Score | 矛盾度 |
| Final Confidence | 最終信頼度 |

### Reasoning

一致した根拠・矛盾した根拠・採用した根拠・除外した根拠と判断理由を内部保持し、AI へ構造化ペイロードとして渡します。

### Unified Model

`Discussion` / `Evidence` / `Consensus` / `Conflict` / `Reasoning` を統合。AI は Unified Model のみ参照します。

## Social / News（維持）

Ver8.1 Social Intelligence・Ver8.0 News Intelligence を維持（投稿／記事本文は非転載）。

## 確認方法

```bash
python -m http.server 5500
```

1. 分析画面「Discussion Status / Evidence数 / Consensus / Conflict / Final Confidence」  
2. Dev Panel「Evidence一覧 / Conflict一覧 / Consensus結果 / Validation」  
3. 単純平均ではなく採用・除外理由が残ること  

## 維持機能

Ver8.1 までの全機能を維持しています。
