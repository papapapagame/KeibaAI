# PAPAPA IQ KEIBA

**Ver7.6.0** — Horse Entry Intelligence

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
登録馬〜出走確定までを Entry Status で管理し、Analysis Stage に応じて AI 入力を切り替えます。

## Horse Entry Engine

```
services/entry/
  HorseEntryManager / EntryDataConnector
  EntrySynchronizer / EntryValidator
  EntryRepository / EntryStateManager
```

### Entry Status

Registered（登録） / 出走予定 / 出走確定 / 取消 / 除外 / 回避  
状態変更履歴を保存します。

### Entry Flow

```
Provider Framework
  → EntryRepository
  → Validator
  → HorseEntry（Unified）
  → Stage Filter
  → AI
```

枠順・騎手・斤量・オッズは **未確定** として扱い、確定情報として渡しません。

### Stage連携

- Stage1: 登録馬のみ  
- Stage2: 出走予定馬  
- Stage3+: 取消・除外・回避を除外し確定情報を待機  

### Validation / Synchronization

必須・重複・欠損・型・Status整合性を検証。異常は AI へ渡さない。  
登録追加・取消・予定変更時のみ Smart Update 再取得。開催日変更で Calendar 連携取得。

## 確認方法

```bash
python -m http.server 5500
```

1. 分析画面「Horse Entry」頭数・充足率  
2. Dev Panel の状態別件数 / Validation / 同期  
3. Stage 表示で暫定評価であることを確認  

## 維持機能

Ver7.5 Race Data Connect までの全機能を維持しています。
