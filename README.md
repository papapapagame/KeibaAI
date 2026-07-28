# PAPAPA IQ KEIBA

**Ver6.0.0** — Betting Intelligence AI（AI馬券戦略システム）

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
「どの馬が強いか」だけでなく、「どう買えば期待値が高いか」を提案します。

## Betting Intelligence AI

```
services/betting/
  betting-engine.js
  ticket-generator.js
  value-analyzer.js
  risk-analyzer.js
  bankroll-manager.js
  combination-optimizer.js
  explain-betting.js
  betting-storage.js
```

### システム構成

IQ / Value / Support / Risk / Market / 期待値 / オッズ / 展開 / 馬場 / 脚質 / 市場心理 / Learning AI を統合し、券種横断の買い目を生成します。人気順だけの機械生成はしません。

### 買い目生成フロー

1. 本命・対抗・穴・危険馬を役割抽出  
2. TicketGenerator が単勝〜三連単＋フォーメーションを生成  
3. Value / Risk でスコアリング  
4. CombinationOptimizer が戦略別（安全 / 期待値 / 穴 / バランス）に最適化  
5. BankrollManager が予算配分  
6. Explain Betting で理由を付与  

### 期待値計算

馬ごとの能力・オッズ・Market Value Opportunity から EV / ROI予測 / 妙味 / 過剰人気 / 過小評価を算出。

### 資金配分

1000 / 3000 / 5000 / 10000 円プリセット。本線・押さえ・穴へ配分。

### 画面

`ticket.html` — Betting Dashboard / 券種 / 比較 / Explain / Confidence / 保存・CSV・JSON。

## 確認方法

```bash
python -m http.server 5500
```

1. 買い目生成画面で Dashboard・Explain Betting を確認  
2. 戦略切替（安全/期待値/穴/バランス）  
3. CSV / JSON / コピー / お気に入り  
