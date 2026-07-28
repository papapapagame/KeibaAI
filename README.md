# PAPAPA IQ KEIBA

**Ver8.0.0** — News Intelligence

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
ニュースは**本文・画像・SNSを転載せず**、公開メタデータを構造化して AI 分析へ取り込みます。

## News Engine

```
services/news/
  NewsManager
  NewsRepository
  NewsSynchronizer
  NewsValidator
  NewsNormalizer
  NewsScoringEngine
```

### 取得対象（メタデータのみ）

公開日時・タイトル・カテゴリ・対象レース／馬／騎手／調教師／開催場・ソース・更新時刻  

**本文全文・画像・SNS投稿は保存・表示しません。**

### Normalization

出走関連 / 調教関連 / コメント / 取消情報 / 騎手情報 / 馬場関連 / 開催情報 / その他

### News Score

| Score | 意味 |
|-------|------|
| Freshness Score | 鮮度 |
| Importance Score | 重要度 |
| Reliability Score | 信頼度 |
| Coverage Score | カバレッジ |

AI へは対象馬・カテゴリ・重要度・鮮度・更新回数・信頼度など構造化データのみ渡します。

### Validation / Synchronization

重複・必須・型・カテゴリ・対象レースを検証。異常は AI へ渡しません。  
新着・更新・取消情報・重要ニュース時のみ Smart Update 再分析します。

### Unified Model

`News` を Horse / Race / AnalysisStage / Knowledge / Learning と統合。AI は Unified Model のみ参照します。

## Weather / Odds / Draw / Entry（維持）

Ver7.9 までの全機能を維持しています。

## 確認方法

```bash
python -m http.server 5500
```

1. 分析画面「ニュース取得数 / 重要ニュース / AI反映状況」  
2. タイトル一覧のみ表示され、本文が無いこと  
3. Dev Panel「News Intelligence」  

## 維持機能

Ver7.9 Weather & Track Intelligence までの全機能を維持しています。
