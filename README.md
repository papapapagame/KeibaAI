# PAPAPA IQ KEIBA

**Version 10.6.0 — Production Integration**  
Build Date: 2026-07-28 · Build Number: 20260728.106

全 Real Provider を統合し、GitHub Pages 上で本番運用可能な品質に仕上げた版です。  
本バージョンでは**新機能は追加していません**（統合・最適化・安定化・品質向上のみ）。  
既存評価ロジック（`js/ai-engine.js` / `js/thinking-engine.js`）は変更していません。

---

## Architecture

```
UI (HTML / CSS / js/*)
  └─ services/*
       ├─ provider/          ← ProviderManager 統一管理
       │    race / horse / odds / weather / news / social
       │    + mock-provider（削除しない）
       ├─ calendar / entry / draw / odds / weather / news / social
       ├─ discussion / explain / knowledge / learning / review
       ├─ update             ← Smart Update（変更時のみ）
       ├─ data               ← Cache / TTL / Dashboard
       ├─ runtime            ← Guard / Dedup / Production Health
       └─ models/unified.js  ← AI 参照の正規モデルのみ
```

**Data Flow（共通）**

```
Provider → Fetcher → Parser → (MetadataExtractor) → Normalizer
  → Validator → Unified Model → AI Engine
  → Discussion → Explainability → Knowledge Graph → Learning
```

**Prediction Engine** = 既存 `ai-engine.js` + `thinking-engine.js`（非改変）

---

## Provider構成

| Provider | Ver | ID | 役割 |
|----------|-----|-----|------|
| Mock | 7.4+ | `mock` | 開発・フォールバック手動切替用（維持） |
| Real Race | 10.0 | `real-race` | 開催カレンダー |
| Real Horse | 10.1 | `real-horse` | 出馬表 |
| Real Odds | 10.2 | `real-odds` | オッズ／人気 |
| Real Weather | 10.3 | `real-weather` | 天候／馬場 |
| Real News | 10.4 | `real-news` | ニュースメタデータ |
| Real Social | 10.5 | `real-social` | SNSトレンドメタデータ |

すべて `ProviderManager` / `ProviderRegistry` から統一管理。  
Analysis Developer Panel で **ドメイン単位に Mock / Real を手動切替**可能。  
Real 失敗時の **自動 Mock 切替は行わない**（明示エラー表示）。

---

## Real Data構成

| 領域 | URL（既定） | 備考 |
|------|-------------|------|
| Calendar | `data/calendar/real-calendar.json` | `REAL_RACE_CALENDAR_URL` |
| Entry | `data/entry/real-entries.json` | `REAL_HORSE_ENTRY_URL` |
| Odds | `data/odds/real-odds.json` | `REAL_ODDS_URL` |
| Weather | `data/weather/real-weather.json` | `REAL_WEATHER_URL` |
| News | `data/news/real-news.json` | 本文なし |
| Social | `data/social/real-social.json` | 投稿本文なし |

外部 API へ差し替える場合は `js/config.js` の各 `REAL_*_URL` を絶対 URL に変更。

---

## Mock構成

| 領域 | パス |
|------|------|
| Calendar | `data/calendar/mock-calendar.json` |
| Odds | `data/odds/mock-odds.json` / `data/horses.json` |
| Weather | `data/weather/mock-weather.json` |
| News | `data/news/mock-news.json` |
| Social | `data/social/mock-social.json` |

Mock Provider（`services/provider/providers/mock-provider.js`）は削除しません。

---

## Data Flow（詳細）

1. **Mode 判定**（各ドメイン `*_mode.js` / localStorage）
2. **Real:** Fetch → Parse → Validate → Normalize → Sync → Unified
3. **Mock:** 静的 JSON → 同一 Engine パイプライン
4. **Smart Update:** 指紋差分があるときのみ再取得・再解析（重複取得／重複解析禁止）
5. **Cache:** Memory + LocalStorage、TTL 管理、期限切れは `purgeExpiredCache`
6. **AI:** Unified Model のみ参照 → Discussion / Explain / Knowledge / Learning

---

## Directory

```
KeibaAI/
  index.html / analysis.html / race-*.html / ...
  style.css
  js/                 # UI・既存 AI Engine（非改変）
  services/
    provider/         # Real + Mock Providers
    runtime/          # Guard / Dedup / Production Health（Ver10.6）
    update/           # Smart Update
    data/             # Cache / Platform
    models/unified.js
    ...
  data/               # Mock + Real JSON（GitHub Pages 対応）
```

---

## Development

```bash
python -m http.server 5500
# http://localhost:5500/
```

1. Analysis → Developer Panel で各 Provider を Mock / Real 切替
2. Production Integration パネルで System / Provider / Cache / Memory / Queue を確認
3. Real 失敗時は自動切替せず、日本語エラーを表示

---

## Deployment / GitHub Pages

- 静的サイトのみ（サーバー不要）
- `data/` 配下の JSON を Pages で配信
- 相対パス `data/` を既定のまま利用
- ブランチ Pages（例: `/docs` または root）どちらでも動作

---

## Production Integration（Ver10.6）

| 項目 | 内容 |
|------|------|
| System Health | 統合ヘルススコア |
| Provider Health | ONLINE / ERROR / OFFLINE 集計 |
| Cache Status | Memory / Local / TTL purge |
| Memory Status | Prefetch 重複防止キー |
| Update Queue | Smart Update キュー長 |
| Error Count | ServiceGuard 集計 |
| Success Rate | Provider 取得成功率の概算 |

配置: `services/runtime/production-health.js` / `provider-integration.js`

---

## 品質方針

- 構文エラー 0 / Console エラー 0 を目標
- 既存 AI ロジック非改変
- 黒×金デザイン維持
- レスポンシブ維持
- Provider 追加は Factory + Registry + Mode + Repository の拡張で可能

---

## 既知の制限

- Real JSON はサンプル／静的データ（外部ライブ API は別途接続）
- ニュース／SNS はメタデータのみ（本文・画像・動画は取得しない）
- 取得成功率はヘルス指標からの概算（厳密な HTTP KPI ではない）
