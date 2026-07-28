# PAPAPA IQ KEIBA

**Ver7.4.0** — Provider Integration Framework

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
AI・画面は Provider へ直接アクセスせず、必ず Provider Framework を経由します。

## Provider Framework

```
services/provider/
  ProviderManager / Registry / Factory / Loader
  ProviderHealthChecker / ProviderLogger
  Priority / Failover / DataMerge / Provenance
```

### Provider Interface

全 Provider が同一口で取得可能：

Race / Horse / Jockey / Trainer / Odds / Weather / TrackCondition / News / Review / Market

### Registry

登録: Mock / JRA / JBIS / netkeiba / KeibaLab / Market / News / Social  
**現時点は Mock のみ有効**。他は接続口のみ。

### Priority / Failover

例（Race）: JRA → JBIS → Mock  
障害時は自動切替（Failover）。

### Data Merge / Provenance

複数ソースは重複排除・優先順位・タイムスタンプ・品質で統合。  
各データに取得元・取得日時・Provider Version・取得状態を保持。

### AI連携フロー

```
Provider Framework
  → RaceRepository
  → RaceDataManager
  → Unified Model
  → AI
```

## 確認方法

```bash
python -m http.server 5500
```

1. 分析画面 Dev Panel「Provider Framework（Ver7.4）」
2. Provider 一覧・状態（ONLINE / OFFLINE 等）
3. Failover / Merge / Provenance  
4. Mock のみ動作、Real は Provider未接続

## 維持機能

Ver7.3 Race & Horse Integration までの全機能を維持しています。
