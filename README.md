# PAPAPA IQ KEIBA

**Version 10.5.0 — Real Social**  
Build Date: 2026-07-28 · Build Number: 20260728.105

実開催カレンダー・出馬表・オッズ・天候・ニュースに続き、SNSトレンドメタデータを Real Data へ移行した段階です。  
既存評価ロジック（`js/ai-engine.js` / `js/thinking-engine.js`）は変更していません。

---

## システム概要

開催カレンダーからレース選択 → 各 Intelligence Engine でデータ収集 → Discussion / Explain / Knowledge → 予想表示、という流れを静的サイト（GitHub Pages）で動作させます。

- 黒×金 UI
- **Mock / Real Provider を設定だけで切替**（Mock は削除しない）
- Real 取得失敗時は **自動で Mock へ切り替えない**（ユーザーへ明示）
- Unified Model のみを AI 参照の正規データとする設計
- **ニュース本文・SNS投稿本文・画像・動画・コメントは保存・表示・転載しない**

---

## アーキテクチャ

```
UI (HTML/CSS/js/*)
  └─ services/*
       ├─ calendar          ← Mock / Real Race Calendar
       ├─ provider/race     ← Ver10.0 RealRaceProvider
       ├─ provider/horse    ← Ver10.1 RealHorseProvider
       ├─ provider/odds     ← Ver10.2 RealOddsProvider
       ├─ provider/weather  ← Ver10.3 RealWeatherProvider
       ├─ provider/news     ← Ver10.4 RealNewsProvider
       ├─ provider/social   ← Ver10.5 RealSocialProvider
       ├─ update / entry / draw / odds / weather
       ├─ news / social / discussion / explain / knowledge
       ├─ learning / review / market / intelligence / provider
       └─ models/unified.js ← AI 参照の正規モデル
Runtime (services/runtime) — エラーガード / Prefetch 重複防止
```

**Prediction Engine** = 既存 `ai-engine.js` + `thinking-engine.js`（非改変）

---

## Real Social Provider（Ver10.5）

配置: `services/provider/social/`

| モジュール | 責務 |
|------------|------|
| `RealSocialProvider` | Provider 共通 I/F |
| `SocialFetcher` | SNSトレンド生データ取得 |
| `SocialParser` | パース（本文破棄） |
| `TrendMetadataExtractor` | 構造化トレンドメタ抽出 |
| `SocialNormalizer` | Unified Social + Score |
| `SocialValidator` | 重複・カテゴリ・投稿日時検証 |
| `SocialSynchronizer` | 変更時のみ同期 / Smart Update |

### Trend Metadata

既定 URL: `data/social/real-social.json`（`REAL_SOCIAL_URL` で差し替え可）  

取得: 投稿日時 / 対象レース・馬・騎手・調教師 / カテゴリ / 投稿数 / トレンド変化率 / 注目度 / 情報ソース / Provider 名  

**非取得:** 投稿本文・画像・動画・コメント

### Provider 切替

Analysis Developer Panel: **Mock Social / Real Social**  
失敗時は自動 Mock 切替なし（「SNS情報を取得できませんでした」）

### Validation / Synchronization

重複・カテゴリ不正・投稿日時異常・必須欠損は不採用。  
急上昇トレンド・カテゴリ変化・投稿数急増・重要トレンド変更時のみ再同期・再分析。

Trend / Attention / Momentum / Confidence Score は実メタデータから算出し、AI は Unified Model のみ参照。

---

## Real News Provider（Ver10.4）

配置: `services/provider/news/`

| モジュール | 責務 |
|------------|------|
| `RealNewsProvider` | Provider 共通 I/F |
| `NewsFetcher` | ニュース生データ取得 |
| `NewsParser` | パース（本文破棄） |
| `NewsMetadataExtractor` | 構造化メタデータ抽出 |
| `NewsNormalizer` | Unified News + Score |
| `NewsValidator` | 重複・カテゴリ・公開日時検証 |
| `NewsSynchronizer` | 変更時のみ同期 / Smart Update |

### News Metadata

既定 URL: `data/news/real-news.json`（`REAL_NEWS_URL` で差し替え可）  

取得: タイトル / 公開・更新日時 / 対象レース・馬・騎手・調教師 / カテゴリ / 重要度 / 情報ソース / Provider 名  

**非取得:** 記事本文・画像・記事全文

### Provider 切替

Analysis Developer Panel: **Mock News / Real News**  
失敗時は自動 Mock 切替なし（「ニュース情報を取得できませんでした」）

### Validation / Synchronization

重複・カテゴリ不正・公開日時異常・必須欠損は不採用。  
新着記事・記事更新・取消関連・重要ニュース変更時のみ再同期・再分析。

Freshness / Importance / Reliability / Coverage Score は実メタデータから算出し、AI は Unified Model のみ参照。

---

## Real Weather Provider（Ver10.3）

配置: `services/provider/weather/`

| モジュール | 責務 |
|------------|------|
| `RealWeatherProvider` | Provider 共通 I/F |
| `WeatherFetcher` | 天候生データ取得 |
| `WeatherParser` | パース |
| `WeatherNormalizer` | Unified Weather/Track + Score |
| `WeatherValidator` | 異常値・必須・更新時刻検証 |
| `WeatherSynchronizer` | 変更時のみ同期 / Smart Update |
| `TrackConditionParser` | 芝／ダート状態正規化 |

### Weather 取得

既定 URL: `data/weather/real-weather.json`（`REAL_WEATHER_URL` で差し替え可）  
天候 / 馬場 / 芝・ダート状態 / 気温 / 湿度 / 風向 / 風速 / 降水量（任意） / 更新時刻 / Provider 名

### Track 取得

馬場状態・芝／ダート状態・含水率を TrackConditionParser で正規化し、Weather Intelligence（Ver7.9）へ連携。

### Provider 切替

Analysis Developer Panel: **Mock Weather / Real Weather**  
失敗時は自動 Mock 切替なし（「天候情報を取得できませんでした」）

### Validation / Synchronization

異常値・必須欠損・更新時刻不正は不採用。  
天候／馬場／風向／風速／更新時刻の変化時のみ再同期・再分析。

Weather Score / Track Score / Surface Score は実データから算出し、AI が天候・馬場を総合評価できる構造を維持。

---

## Real Odds Provider（Ver10.2）

配置: `services/provider/odds/`

| モジュール | 責務 |
|------------|------|
| `RealOddsProvider` | Provider 共通 I/F |
| `OddsFetcher` | オッズ生データ取得 |
| `OddsParser` | パース |
| `OddsNormalizer` | Unified Odds + Market/Support/Value Score |
| `OddsValidator` | 異常値・人気重複・欠損検証 |
| `OddsSynchronizer` | 変更時のみ同期 / Smart Update |
| `OddsHistoryManager` | 変動履歴・更新回数 |

### Odds 取得

既定 URL: `data/odds/real-odds.json`（`REAL_ODDS_URL` で差し替え可）  
単勝 / 複勝 / 人気 / 更新時刻 / 変動履歴 / Provider 名

### Odds History

変更差分を履歴に記録し、更新回数を Dev Panel に表示。

### Provider 切替

Analysis Developer Panel: **Mock Odds / Real Odds**  
失敗時は自動 Mock 切替なし（「オッズ情報を取得できませんでした」）

### Validation / Synchronization

オッズ異常・人気重複・必須欠損は不採用。  
単勝／複勝／人気／更新時刻の変化時のみ再同期・再分析。

Market / Support / Value Score は実オッズから算出し、人気順のみに依存しない。

---

## Real Horse Provider（Ver10.1）

配置: `services/provider/horse/`

| モジュール | 責務 |
|------------|------|
| `RealHorseProvider` | Provider 共通 I/F |
| `HorseEntryFetcher` | 出馬表生データ取得 |
| `HorseEntryParser` | パース |
| `HorseEntryNormalizer` | Unified Horse/Entry/Draw/Jockey/Trainer |
| `HorseEntryValidator` | 馬番/枠番重複・騎手・斤量・必須検証 |
| `HorseEntrySynchronizer` | 変更時のみ同期 / Smart Update |

### Horse Entry 取得

既定 URL: `data/entry/real-entries.json`  
`REAL_HORSE_ENTRY_URL` で差し替え可能。

取得項目: 馬名 / 馬番 / 枠番 / 性齢 / 斤量 / 騎手 / 調教師 / 所属 / 負担重量 / 出走状態 / 除外 / 取消 / 各 ID

### Provider 切替

Analysis Developer Panel: **Mock Entry / Real Entry**  
`localStorage` キー: `papapa_iq_entry_mode_v101`  
Real 失敗時は自動 Mock 切替なし（「出馬表を取得できませんでした」）

### Validation / Synchronization

馬番重複・枠番異常・騎手欠損・斤量異常・必須欠損は不採用。  
取消・除外・騎手変更・斤量変更・出馬表更新時のみ再同期。

### Analysis Stage 反映

- Stage2: 登録馬・出走予定
- Stage3: 確定出馬表（枠・馬番）
- Stage4: 騎手確定
- Stage5: 斤量確定

---

## Real Race Provider（Ver10.0）

配置: `services/provider/race/`

| モジュール | 責務 |
|------------|------|
| `RealRaceProvider` | Provider 共通 I/F 実装 |
| `RaceCalendarFetcher` | 生データ取得（timeout 対応） |
| `RaceCalendarParser` | パース |
| `RaceCalendarNormalizer` | Unified Model 正規化 |
| `RaceCalendarValidator` | 検証（失敗データは不採用） |
| `RaceCalendarSynchronizer` | 変更時のみ同期 / Smart Update |

### Provider 切替

- Calendar Dev Panel: **Mock Calendar / Real Calendar**
- `localStorage` キー: `papapa_iq_calendar_mode_v71`
- Provider Framework: `mock` と `real-race` を登録（Stub は未接続のまま）
- Source Mode (`mock|real|auto`) とも共存

### Race Calendar 取得

既定 URL: `data/calendar/real-calendar.json`（GitHub Pages 対応）  
`js/config.js` の `REAL_RACE_CALENDAR_URL` で外部 API へ差し替え可能。

取得項目: 開催日 / 開催場 / 開催回 / 日数 / レース番号 / レース名 / 発走 / 芝ダ / 距離 / 左右 / 条件 / グレード / 年齢条件 / 出走可能頭数

### Validation

開催日・開催場・レース重複・時刻・距離・必須項目を検証。  
失敗レースは採用せず、致命的エラー時は「現在実データを取得できません」。

### Synchronization

指紋（fingerprint）比較で変更が無い場合は再取得・再同期しない。  
変更時のみ `meeting_update` を Smart Update へ通知。

---

## Unified Model（Ver10 追加）

`createCalendar` / `createSchedule` / `createVenue` / `createRace` / `createAnalysisStageRef`  
AI は Unified Model（および導出 `aiInput`）のみを参照します。

---

## ディレクトリ構成

```
KeibaAI/
  index.html / analysis.html / race-*.html / ...
  style.css
  js/
  services/
    provider/
      race/                 # Ver10.0 Real Race Calendar
      horse/                # Ver10.1 Real Horse Entry
      odds/                 # Ver10.2 Real Odds
      weather/              # Ver10.3 Real Weather
      news/                 # Ver10.4 Real News
      social/               # Ver10.5 Real Social
      providers/mock-provider.js
    calendar/
    entry/
    odds/
    weather/
    news/
    social/
    models/unified.js
    ...
  data/
    calendar/
      mock-calendar.json
      real-calendar.json
    entry/
      real-entries.json
    odds/
      mock-odds.json
      real-odds.json
    weather/
      mock-weather.json
      real-weather.json
    news/
      mock-news.json
      real-news.json
    social/
      mock-social.json
      real-social.json
```

---

## 各 Engine（要約）

| Engine | Ver | 役割 |
|--------|-----|------|
| Real Race Calendar | 10.0 | 実開催カレンダー取得 |
| Real Horse Entry | 10.1 | 実出馬表取得 |
| Real Odds | 10.2 | 実オッズ／人気取得 |
| Real Weather | 10.3 | 実天候／馬場取得 |
| Real News | 10.4 | 実ニュースメタデータ取得 |
| Real Social | 10.5 | 実SNSトレンドメタデータ取得 |
| Calendar | 7.1+ | 開催日・Stage（Mock/Real） |
| Smart Update | 7.2 | 変更時のみ再分析 |
| Entry〜Knowledge | 7.6–8.4 | 既存機能維持 |
| Runtime Guard | 9.0 | 品質ガード |

---

## Data Flow（Calendar）

1. Calendar Mode 判定（mock / real）
2. Real: Fetch → Parse → Validate → Normalize → Sync → Unified
3. UI: 実開催日のみ選択可 / その日の開催場のみ
4. Race List: 1R→12R（発走順）
5. 変更時のみ Smart Update

---

## 開発方法

```bash
python -m http.server 5500
# http://localhost:5500/
```

トップの Developer Panel で Real Calendar に切替えて動作確認。

---

## GitHub Pages 公開方法

1. Settings → Pages → Deploy from branch（`main` / root）
2. `index.html` がルートにあることを確認
3. Real フィードは同一オリジンの `data/calendar/real-calendar.json` を参照

---

## 今後の拡張ポイント

- `REAL_RACE_CALENDAR_URL` を公式/自前 API へ接続
- Horse / Odds / Weather の Real Provider 拡張
- Prediction Engine 進化は別バージョンで慎重に

---

## ライセンス / 注意

本システムは学習・研究・個人利用向けの分析支援です。  
投資助言ではありません。公式データ利用時は各規約を遵守してください。
