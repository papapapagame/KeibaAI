# PAPAPA IQ KEIBA

**Ver5.0.0** — 正式版（AI対決強化 / 思考ログ / ニュース）

AI評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更せず、分析体験を正式版品質へ拡張しています。予想結果は変わりません。

## Ver5.0.0 追加内容

1. AI対決（GPT Racing / Deep Odds / Horse Vision / Value Hunter）
2. AI信頼度履歴グラフ（直近10レース・デモ）
3. AI思考ログ（0→100%）
4. AIコメント長文化（展開・馬場・脚質・騎手・枠・オッズ・EV）
5. AIニュース / AIランキング（デモ）
6. 分析完了演出（金色フラッシュ / 振動 / SE / AI COMPLETE）
7. 全ページ共通「トップページへ戻る」（既存スクロールトップは維持）
8. スマホ最適化（Safe Area / 横画面 / reduced-motion）

## 確認方法

```bash
python -m http.server 5500
```

1. AI分析で思考ログ〜COMPLETE演出を確認
2. AI対決タブで印提示→討論開始→FINAL DECISION
3. 各ページで「トップページへ戻る」を確認
