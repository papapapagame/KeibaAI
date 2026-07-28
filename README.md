# PAPAPA IQ KEIBA

**Ver7.0.0** — Real Data Platform Foundation

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
実データへ安全に移行できる基盤を構築しました。現段階の動作 Provider は **Mock のみ**です。

## Real Data Platform

```
services/data/
  api.js                     # AI向け唯一の取得口
  data-provider-manager.js
  data-normalizer.js
  data-validator.js
  data-cache-manager.js
  data-scheduler.js
  provider-health-monitor.js
  provider-selector.js
  unified-models.js
  providers/
    mock-provider.js         # 実装済
    stubs.js                 # JRA / netkeiba / JBIS / … IFのみ
```

### データフロー

```
Provider → Normalizer → Validator → Cache → Unified Model → AI
```

AI は Provider へ直接アクセスしません。必ず `getRaceBundleForAi()` / `fetchAnalysisBundleViaPlatform()` 経由です。

### Provider構造

| Provider | 状態 |
|----------|------|
| mock | 実装済（local JSON） |
| jra / netkeiba / jbis / keibalab / market / news / social | インターフェースのみ（Provider未接続） |

### Unified Model

Race / Horse / Jockey / Trainer / Odds / Result / Market / Review / Learning / Knowledge  

表記ゆれ（芝1600 / 芝1600m / 1600芝）は `芝1600m` に正規化します。

### Mock ⇔ Real 切替

Developer Panel / Data Dashboard で **Mock / Real / Auto** を切替。  
Real 選択時は「Provider未接続」を表示（現段階）。

### 画面

`data.html` — Data Dashboard（Provider・キャッシュ・更新・件数・エラー）

## 確認方法

```bash
python -m http.server 5500
```

1. `data.html` で Provider 状態と Mock 切替を確認  
2. `analysis.html` Developer Panel の Data Source Switch  
3. Real 選択 → Provider未接続、Mock に戻すと復旧  

## 維持機能

Ver6.5 Race Review / Ver6.0 Betting / Ver5.5 Learning など既存機能を維持しています。
