# PAPAPA IQ KEIBA

**Ver7.2.0** — Smart Update Engine

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
時間スケジュールとデータ変化イベントの両方を見て、必要なときだけ AI 再分析します。

## Smart Update Engine

```
services/update/
  smart-update-engine.js
  update-scheduler.js
  event-watcher.js
  refresh-manager.js
  analysis-trigger.js
  update-history-manager.js
```

### Scheduler

| 条件 | 間隔 |
|------|------|
| 月〜水 | 6時間 |
| 木 | 3時間 |
| 金 | 1時間 |
| 開催日当日 | 30分 |
| 発走90〜15分前 | 15分 |
| 発走15分前 | 最終分析 |
| 発走後 | Race Review 待機 |

### Event Trigger

枠順確定 / 騎手変更 / 取消 / 除外 / 斤量 / 馬場 / 天候 / オッズ急変 / 開催情報 / Provider / ニュース / Stage変化  

Mock イベントで手動発火可能。Real Provider へ切替可能な構造です。

### Update Priority

- **Critical**（騎手・取消・除外・枠順・Stage）→ 即時再分析  
- **High**（馬場・天候）→ 優先再分析  
- **Medium**（オッズ等）→ 通常  
- **Low**（ニュース）→ 次回更新時  

### Update Flow

```
Event / Schedule
  → AnalysisTrigger（差分比較）
  → 変更なしならスキップ
  → RefreshManager
  → 再分析 + Update Reason 表示
  → Update Log 保存
```

### 画面

- `update.html` — Update Dashboard  
- `analysis.html` — AI Update Reason / Dev Panel（Auto ON/OFF・Mock Events）

## 確認方法

```bash
python -m http.server 5500
```

1. `update.html` で状態・履歴を確認  
2. Mock Events を発火し、理由表示と履歴を確認  
3. 同一内容の連続 Tick ではスキップされること  

## 維持機能

Ver7.1 Calendar / Ver7.0 Data Platform / Review / Betting / Learning を維持しています。
