# PAPAPA IQ KEIBA

**Ver5.3.0** — AI Intelligence Engine（AI分析エンジン）

既存の評価ロジック（`ai-engine.js` / `thinking-engine.js`）は維持したまま、  
取得データを統合解析する **独自 Intelligence Engine** を追加しました。

## AI Intelligence Engine

```
services/ai/
  intelligence-engine.js   … 統合オーケストレータ
  analyzers/
    race-analyzer.js
    horse-analyzer.js
    odds-analyzer.js
    history-analyzer.js
    pace-analyzer.js
    track-analyzer.js
    trend-analyzer.js
    sentiment-analyzer.js
  score-builder.js         … IQ / Pace / Value / Trust …
  explainable.js           … 評価根拠
  comment-generator.js     … 可変コメント
  report-builder.js        … AI REPORT
```

### Analyzer 構造

各 Analyzer は独立。Race / Horse / Odds / History / Pace / Track / Trend / Sentiment。

### Score 計算

取得データ（レース・馬・オッズ・履歴・ニュース等）から:

- **IQ Score**（0〜100）
- Pace / Value / Trust / Danger / Trend / Buzz / Support / Risk
- Market Sentiment

を生成します。

### Explainable AI

IQ Score に対し「距離適性 +8」「期待値 +12」など寄与要因を表示します。

### AI Confidence / AI REPORT

- Confidence: ★表示 + パーセント
- REPORT: 総評 / 展開 / 危険馬 / 穴馬 / 期待値ランキング / おすすめ買い目

## Real Intelligence Connect（Ver5.2）

JRA・ニュースは同一オリジン実装。他 Provider は TODO。

## 確認方法

```bash
python -m http.server 5500
```

1. AI分析画面で独自AI指標・Explainable AI・AI REPORT を確認
2. 既存の AI新聞 / AI対決 / シミュレーションが従来どおり動くこと
