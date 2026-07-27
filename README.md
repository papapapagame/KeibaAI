# PAPAPA IQ KEIBA

**Ver3.2.0** — AI分析感強化（表示層）

AIロジック（`ai-engine.js` / `thinking-engine.js`）は変更せず、分析ページの「AI分析感」を大幅強化しました。

## Ver3.2.0 追加内容

1. AIシミュレーション ×1000（勝率 / 連対率 / 複勝率 / EV・カウントアップ）
2. AI能力レーダー（スピード / 先行力 / 瞬発力 / 持久力 / 安定感）
3. コース・馬場適性（星アニメーション）
4. AI危険馬アラート（赤・黄・青バッジ）
5. AI注目穴馬カード
6. AI期待値(EV)ゲージ（買い / 様子見 / 見送り）
7. AI総合コメント強化（展開〜不安材料まで長文）
8. 分析シーケンス演出（スキャンライン / グロー / 順次フェード）
9. スマホ最適化（iPhone Safari / Android Chrome / Safe Area）

## 変更ファイル

- `analysis.html`
- `style.css`
- `js/analysis.js`
- `js/config.js` / `README.md` / `ROADMAP.md`

※ 予想ロジック本体は未変更です。

## 確認方法

```bash
python -m http.server 5500
```

1. レース詳細 → AI分析
2. 上部シミュレーションとスキャン演出を確認
3. 馬別レーダー / 適性星 / 危険バッジ / EV色分けを確認
4. スマホ幅・Safe Areaで崩れがないことを確認
