# PAPAPA IQ KEIBA

**Ver7.7.0** — Draw & Jockey Intelligence

既存評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
枠順・馬番・騎手・斤量などの**確定情報のみ**を管理し、Analysis Stage を Stage5 まで進めます。  
未確定情報は推測で補完しません。

## Draw & Jockey Engine

```
services/draw/
  DrawManager
  JockeyManager
  WeightManager
  DrawSynchronizer
  DrawValidator
  DrawStateManager
```

### 取得対象（確定情報）

枠番・馬番・騎手・斤量・乗り替わり・出走取消・競走除外・騎手/斤量変更履歴

本バージョンで **未取得**: オッズ・当日馬場・最終天候・直前情報

### Entry → Draw フロー

```
登録馬 → 出走予定馬 → 確定出走馬 → 枠順・騎手・斤量
（Ver7.6 Entry）              （Ver7.7 Draw）
```

### Analysis Stage

| Stage | 内容 |
|-------|------|
| 3 | 枠順確定 |
| 4 | 騎手確定 |
| 5 | 斤量確定 |

情報が確定するごとに Stage を更新。確定した情報のみ AI へ渡し、枠順/騎手/斤量/乗り替わり/取消・除外の補正を反映します。

### Synchronization / Smart Update

枠順確定・騎手変更・斤量変更・取消・除外を検知し、**変更時のみ**再分析します。

### Validation

枠番・馬番重複、騎手重複、斤量異常、取消整合性を検証。異常は AI へ渡しません。

### Data Completeness

枠順 / 騎手 / 斤量 / 取消情報の取得率を表示。オッズ・ニュースは 0%。Overall を Confidence へ反映します。

## Horse Entry Engine（Ver7.6 維持）

`services/entry/` — Registered〜Withdrawn の Entry Status 管理を継続。

## 確認方法

```bash
python -m http.server 5500
```

1. 分析画面 Stage3〜5 / 取得済み・未取得情報  
2. Draw Completeness（枠・騎手・斤量）  
3. Dev Panel「Draw & Jockey」  
4. Mock Events で変更なしスキップを確認  

## 維持機能

Ver7.6 Horse Entry Intelligence までの全機能を維持しています。
