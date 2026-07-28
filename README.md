# PAPAPA IQ KEIBA

**Version 10.0.0 — Real Race Calendar**  
Build Date: 2026-07-28 · Build Number: 20260728.100

実開催カレンダー取得へ移行した第一段階です。  
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
       ├─ provider/race     ← Ver10 RealRaceProvider 一式
       ├─ update / entry / draw / odds / weather
       ├─ news / social / discussion / explain / knowledge
       ├─ learning / review / market / intelligence / provider
       └─ models/unified.js ← AI 参照の正規モデル
Runtime (services/runtime) — エラーガード / Prefetch 重複防止
```

**Prediction Engine** = 既存 `ai-engine.js` + `thinking-engine.js`（非改変）

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
      race/                 # Ver10 Real Race Calendar
      providers/mock-provider.js
    calendar/
    models/unified.js
    ...
  data/
    calendar/
      mock-calendar.json    # Mock（維持）
      real-calendar.json    # Real フィード（差し替え可）
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
