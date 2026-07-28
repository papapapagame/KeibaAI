# PAPAPA IQ KEIBA

**Version 10.2.0 — Real Odds**  
Build Date: 2026-07-28 · Build Number: 20260728.102

実開催カレンダー・出馬表に続き、オッズ／人気を Real Data へ移行した段階です。  
既存評価ロジック（`js/ai-engine.js` / `js/thinking-engine.js`）は変更していません。

---

## システム概要

開催カレンダーからレース選択 → 各 Intelligence Engine でデータ収集 → Discussion / Explain / Knowledge → 予想表示、という流れを静的サイト（GitHub Pages）で動作させます。

- 黒×金 UI
- **Mock / Real Provider を設定だけで切替**（Mock は削除しない）
- Real 取得失敗時は **自動で Mock へ切り替えない**（ユーザーへ明示）
- Unified Model のみを AI 参照の正規データとする設計

---

## アーキテクチャ

```
UI (HTML/CSS/js/*)
  └─ services/*
       ├─ calendar          ← Mock / Real Race Calendar
       ├─ provider/race     ← Ver10.0 RealRaceProvider
       ├─ provider/horse    ← Ver10.1 RealHorseProvider
       ├─ provider/odds     ← Ver10.2 RealOddsProvider
       ├─ update / entry / draw / odds / weather
       ├─ news / social / discussion / explain / knowledge
       ├─ learning / review / market / intelligence / provider
       └─ models/unified.js ← AI 参照の正規モデル
Runtime (services/runtime) — エラーガード / Prefetch 重複防止
```

**Prediction Engine** = 既存 `ai-engine.js` + `thinking-engine.js`（非改変）

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
      providers/mock-provider.js
    calendar/
    entry/
    odds/
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
```

---

## 各 Engine（要約）

| Engine | Ver | 役割 |
|--------|-----|------|
| Real Race Calendar | 10.0 | 実開催カレンダー取得 |
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
