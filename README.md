# PAPAPA IQ KEIBA

**Ver4.0.0** — 正式版（AI対決モード）

AIロジック（`ai-engine.js` / `thinking-engine.js`）は変更せず、分析体験と共通UIを正式版品質へ引き上げました。

## Ver4.0.0 目玉機能

### ① AI対決モード
- 5AI（本命 / 穴馬 / データ / 展開 / オッズ）が討論
- 思考シーケンス → 討論開始演出 → 吹き出しログ（タイピング）
- AI FINAL DECISION（合意率・推奨印・推奨買い目・理由）

### ② 全ページ共通「TOPへ戻る」
- 右下固定 / 300px超でフェードイン
- SVG矢印 + 金色グロー / スクロール中の脈動
- `utils.js` で共通コンポーネント化（自動生成対応）

### UI強化
- 金色ライン発光 / カードホバー / 微粒子 / ガラスカード
- スキャンライン・ゲージ・カウントアップ演出

## 変更ファイル

- `analysis.html` / `style.css` / `js/analysis.js`
- `js/ai-debate.js`（新規・表示層）
- `js/utils.js`（TOPボタン共通化）
- `js/config.js` / `README.md` / `ROADMAP.md`

※ 予想ロジック本体は未変更です。

## 確認方法

```bash
python -m http.server 5500
```

1. AI分析 → 「AI対決」タブ
2. 思考シーケンス〜最終結論を確認
3. 各ページでスクロールし「TOPへ戻る」を確認
