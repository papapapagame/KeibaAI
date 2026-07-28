# PAPAPA IQ KEIBA

**Version 9.0.0 — Release Candidate**  
Build Date: 2026-07-28 · Build Number: 20260728.90

AI競馬分析システムの製品版リリース候補です。  
既存評価ロジック（`js/ai-engine.js` / `js/thinking-engine.js`）は変更していません。

---

## システム概要

開催カレンダーからレース選択 → 各 Intelligence Engine でデータ収集 → Discussion で根拠比較 → Explain で説明生成 → Knowledge Graph で関連統合 → 予想表示、という一連の流れを静的サイト（GitHub Pages）で動作させます。

- 黒×金 UI
- Mock / Real Provider 切替（現状は Mock が主動作）
- Unified Model のみを AI 参照の正規データとする設計

---

## アーキテクチャ

```
UI (HTML/CSS/js/*)
  └─ services/*
       ├─ calendar / update / entry / draw / odds / weather
       ├─ news / social / discussion / explain / knowledge
       ├─ learning / review / market / intelligence / provider
       └─ models/unified.js   ← AI 参照の正規モデル
Runtime (services/runtime) — エラーガード / Prefetch 重複防止
```

**Prediction Engine** = 既存 `ai-engine.js` + `thinking-engine.js`（非改変）  
周辺 Engine は補正・説明・議論・知識を **表示層／補助層** で付与します。

---

## ディレクトリ構成

```
KeibaAI/
  index.html / analysis.html / race-*.html / ...
  style.css
  js/                 # UI・Prediction Engine
  services/           # 各 Engine
    models/unified.js
    runtime/          # Ver9.0 品質ガード
    calendar|update|entry|draw|odds|weather|
    news|social|discussion|explain|knowledge|
    learning|review|market|intelligence|provider|...
  data/               # Mock JSON
  docs/
```

---

## 各 Engine（要約）

| Engine | Ver | 役割 |
|--------|-----|------|
| Calendar | 7.1 | 開催日・Stage |
| Smart Update | 7.2 | 変更時のみ再分析 |
| Entry / Draw / Odds / Weather | 7.6–7.9 | 出走・枠騎手・市場・馬場 |
| News / Social | 8.0–8.1 | 構造化メタのみ（本文非転載） |
| Discussion | 8.2 | Evidence 比較・合意 |
| Explainability | 8.3 | 寄与率・理由・差分 |
| Knowledge Graph | 8.4 | 推論用グラフ統合 |
| Learning / Review | 5.5 / 6.5 | 学習・振り返り |
| Runtime Guard | 9.0 | タイムアウト・Recovery・重複取得防止 |

---

## Unified Model

`Horse` / `Race` / `News` / `Social` / `Discussion` / `Evidence` / `Explain` / `KnowledgeGraph` などを `services/models/unified.js` に統合。  
AI は Unified Model（およびそこから導出した `aiInput`）のみを参照します。

---

## Analysis Stage

Stage0〜 の確定度に応じて Entry / Draw / Odds 等の利用範囲が変わります。  
暫定データは過信せず、Confidence / Completeness と併せて表示します。

---

## Data Flow

1. Calendar / Race Connect でレース文脈確定  
2. Entry→Draw→Odds→Weather→News→Social を取得（silent / emitUpdate:false を基本）  
3. Intelligence / Market 解析  
4. Discussion → 順位補正 → Explain → Knowledge Graph  
5. Prediction Engine（既存）で最終予想  
6. Smart Update が差分イベント時のみ再トリガ  

---

## Provider 構成

- **Mock**: `data/*.json`（GitHub Pages で主動作）
- **Real**: Provider Framework 経由（未接続時は Mock へフォールバック）
- Developer Panel から Mock / Real / Auto を切替可能

---

## 開発方法

```bash
# リポジトリ直下で静的サーバ
python -m http.server 5500
# ブラウザで http://localhost:5500/
```

- エントリ: `js/main.js`（ES Modules）
- 設定: `js/config.js`

---

## GitHub Pages 公開方法

1. リポジトリ Settings → Pages  
2. Source: Deploy from branch（通常 `main` / `/ (root)`）  
3. `index.html` がルートにあることを確認  
4. 公開 URL でカレンダー → 分析画面まで動作確認  

相対パス `data/`・`js/`・`style.css` 前提のため、サブパス配下に置く場合はパス調整が必要です。

---

## Ver9.0 RC で実施した品質作業（新機能なし）

- 全体統合確認（循環参照の一方向化維持）
- Prefetch / Smart Update イベントの重複抑制
- Knowledge Graph 同一コンテキスト再同期スキップ
- ServiceGuard（例外・タイムアウト・Recovery・ユーザー向けメッセージ）
- Analysis / Dev Panel の RC 情報・エラー件数・Performance
- レスポンシブ微調整（スマホでの Status リスト）

---

## 今後の拡張ポイント

- Real Provider 本接続（JRA / オッズ / 天候 API）
- X / ニュース実データ（本文非保存ポリシー維持）
- Learning 自動重み適用（現ポリシーは手動）
- Prediction Engine 自体の進化は別バージョンで慎重に

---

## ライセンス / 注意

本システムは学習・研究・個人利用向けの分析支援です。  
投資助言ではありません。公式データ利用時は各規約を遵守してください。
