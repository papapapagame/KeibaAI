# PAPAPA IQ KEIBA

**Ver8.1.0** — Social Intelligence

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
SNS投稿は**本文・画像・動画・コメントを転載せず**、公開メタデータを構造化して AI 分析へ取り込みます。  
ニュース（Ver8.0）と統合し、AI が双方を総合評価できる基盤です。

## Social Engine

```
services/social/
  SocialManager
  SocialRepository
  SocialSynchronizer
  SocialValidator
  SocialNormalizer
  SocialScoringEngine
  TrendAnalyzer
```

### 取得対象（メタデータのみ）

投稿日時・対象レース／馬／騎手／調教師・投稿種別・情報ソース・更新時刻・投稿数  

**投稿本文・画像・動画・コメントは保存・表示しません。**

### Normalization

調教話題 / 馬体話題 / 騎手話題 / パドック話題 / 取消話題 / 人気話題 / 開催話題 / その他

### Trend Analysis

| Score | 意味 |
|-------|------|
| Trend Score | 総合トレンド |
| Attention Score | 注目度 |
| Momentum Score | 勢い |
| Confidence Score | 信頼度 |

AI へはカテゴリ・対象馬・重要度・鮮度・投稿数・トレンド変化・信頼度など構造化データのみ渡します（本文なし）。

### Validation / Synchronization

重複・カテゴリ・対象レース・対象馬・型を検証。失敗データは AI へ渡しません。  
新規話題・急激な投稿増加・重要カテゴリ追加・トレンド変化時のみ Smart Update 再分析します。

### Unified Model

`Social` を Horse / Race / AnalysisStage / Knowledge / Learning / News と統合。AI は Unified Model のみ参照します。

## News Engine（Ver8.0 維持）

```
services/news/
  NewsManager / Repository / Synchronizer / Validator / Normalizer / ScoringEngine
```

記事本文・画像は非転載。構造化メタデータのみ。

## Weather / Odds / Draw / Entry（維持）

Ver7.9 までの全機能を維持しています。

## 確認方法

```bash
python -m http.server 5500
```

1. 分析画面「SNS解析件数 / 現在のトレンド / 注目カテゴリ / AI反映状況」  
2. 投稿本文が表示されないこと  
3. Dev Panel「Social Status / Trend Status / カテゴリ件数 / Validation / 同期 / 最終更新」  

## 維持機能

Ver8.0 News Intelligence までの全機能を維持しています。
