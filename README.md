# PAPAPA IQ KEIBA

**Ver7.6.0** — Horse Entry Intelligence

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
登録馬〜出走確定までを Entry Status で管理し、Analysis Stage に応じて AI 入力を切り替えます。  
**登録情報と確定情報を厳密に区別**し、未確定情報を確定として AI に渡しません。

## Horse Entry Engine

```
services/entry/
  HorseEntryManager
  HorseEntryRepository
  HorseEntrySynchronizer
  HorseEntryValidator
  HorseEntryStateManager
  HorseEntryFormatter
```

### Entry Status

| Status | 意味 |
|--------|------|
| Registered | 登録 |
| Entry Expected | 出走予定 |
| Confirmed | 出走確定 |
| Scratched | 取消 |
| Excluded | 除外 |
| Withdrawn | 回避 |

状態変更履歴を保持します。

### 取得対象（登録情報）

馬名・性別・馬齢・所属・調教師・通算/近走成績・距離/コース/馬場実績・脚質・重賞実績・獲得賞金

本バージョンで **取得しない（未確定）**: 枠順・馬番・騎手・斤量・オッズ

### Entry Flow

```
Provider Framework
  → HorseEntryRepository
  → HorseEntryValidator
  → HorseEntry（Unified Model）
  → Stage Filter（HorseEntryManager）
  → AI（Unified のみ参照）
```

### Analysis Stage 連携

- **Stage1**: 登録馬情報のみ利用
- **Stage2**: 出走予定馬情報を利用
- **Stage3以降**: 枠順・騎手などの確定情報を待機（未確定は渡さない）

分析画面に「現在分析中 / 利用中データ / 未確定情報 / 暫定分析」を表示します。

### Validation

必須・重複・型・欠損・Entry Status 整合性を検証。  
失敗データは AI へ渡しません。

### Synchronization / Smart Update

登録馬追加・登録取消・出走予定変更・状態変更を検知し、変更時のみ再取得・再分析します。

### Race Calendar 連携

- 開催日変更 → 対象開催の登録馬一覧を取得
- 開催場変更 → 対象開催場のみ再取得

### Data Completeness

登録馬 / 戦績 / 調教師 / 距離実績などの取得率を計算。  
枠順・騎手・斤量・オッズは本バージョン **0%**。Overall を Confidence へ反映します。

## 確認方法

```bash
python -m http.server 5500
```

1. 分析画面「現在分析中」パネル（Stage / 利用中 / 未確定）  
2. Horse Entry 頭数・取得率・Entry Completeness  
3. Dev Panel「Horse Entry Status」  
4. トップで開催日・開催場変更時の Entry 再取得  

## 維持機能

Ver7.5 Race Data Connect までの全機能を維持しています。
