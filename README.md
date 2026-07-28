# PAPAPA IQ KEIBA

**Ver5.4.0** — Market Intelligence AI（市場心理分析）

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
記事本文・SNS投稿・予想サイトの内容は**表示・転載しません**。AIが解析した独自スコアのみユーザーへ提示します。

## Market Intelligence AI

```
services/market/
  market-engine.js
  analyzers/
    sentiment-analyzer.js
    trend-analyzer.js
    buzz-analyzer.js
    news-analyzer.js
    social-analyzer.js
    tip-site-analyzer.js
  score-builder.js
  explainable.js
  final-iq.js
  x-signals.js
```

### 市場心理分析

世の中の評価・期待・話題性・不安材料を解析し、馬の能力分析と統合します。

### 独自指標（0〜100）

- Support Score / Buzz Score / Risk Score / Trend Score
- Market Confidence / Market Heat / Public Expectation / Value Opportunity
- **Final IQ Score**（Horse / Race / Odds / History / Market 統合）

### AI統合評価

Intelligence Engine（能力・展開・オッズ等）と Market Analyzer を合成し Final IQ を生成します。  
JRA・netkeiba・JBIS・競馬ラボ・ウマークス・ウマニティ・X などは Provider 追加だけで Market Analyzer が利用できる設計です。

### 表示ポリシー

- ニュース本文・X投稿・予想サイト本文は UI に出さない
- Market Dashboard / Explainable Market AI / Final IQ のみ表示

## 確認方法

```bash
python -m http.server 5500
```

1. AI分析画面で Market Dashboard・Final IQ を確認
2. DEBUG 時に Market Analyzer モニタを確認
3. 記事本文や投稿が表示されていないこと
