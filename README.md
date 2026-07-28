# PAPAPA IQ KEIBA

**Ver7.9.0** — Weather & Track Intelligence

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
天候・馬場・気象情報を取得し、他要素と統合して AI 分析へ反映します。  
ニュース・SNS・レース後情報は本バージョンの対象外です。

## Weather Engine

```
services/weather/
  WeatherManager
  WeatherRepository
  WeatherSynchronizer
  WeatherValidator
  WeatherHistoryManager
  TrackConditionManager
```

### 取得対象

天候・気温・湿度・風速・風向・馬場状態・芝／ダート状態・含水率（Provider対応時）・更新時刻

### Track Intelligence

| Score | 意味 |
|-------|------|
| Track Score | 馬場コンディション |
| Weather Score | 天候・気温・湿度 |
| Surface Score | 芝／ダート適性環境 |

天候・馬場・風・芝ダート・含水率の補正を統合評価します（単独要因化しません）。

### Analysis Stage

| Stage | 内容 |
|-------|------|
| 6 | 前日天候・馬場情報 |
| 7 | 当日最新天候・馬場情報 |

### Validation / Synchronization

異常値・欠損・型・更新時刻を検証。失敗データは AI へ渡しません。  
天候・馬場・風速・風向・含水率の変更時のみ Smart Update 再分析します。

### Data Completeness

天候 / 馬場 / 風 / 含水率の取得率を表示。ニュース・SNSは **0%**。Overall を Confidence へ反映します。

## Odds / Draw / Entry（維持）

- Ver7.8 Odds & Market
- Ver7.7 Draw & Jockey
- Ver7.6 Horse Entry

## 確認方法

```bash
python -m http.server 5500
```

1. 分析画面「取得済み: 天候・馬場状態・風・気象情報」  
2. Weather Completeness / Dev Panel「Weather & Track」  
3. Mock Events の天候・馬場変更で変更なしスキップを確認  

## 維持機能

Ver7.8 Odds & Market Intelligence までの全機能を維持しています。
