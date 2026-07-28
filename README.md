# PAPAPA IQ KEIBA

**Ver5.2.0** — Real Intelligence Connect（実データ接続）

AI評価ロジック（`ai-engine.js` / `thinking-engine.js`）は変更していません。  
Ver5.1 までの機能（AI体験 / Intelligence Platform / Real Data Foundation）を維持したまま、実装可能な情報取得を接続しました。

## Real Intelligence Connect

同一オリジン（GitHub Pages 対応）で取得できるデータのみ実装しています。  
外部サイトのスクレイピングや API キー必須の接続は、利用規約・CORS 制約のため **TODO** のまま残しています。

### Provider 構成

| Provider | 状態 | 取得方法 |
|----------|------|----------|
| JRA | **実装済** | `data/race.json` / `horses.json` + `data/intelligence/*` スナップショット |
| ニュース | **実装済** | `data/intelligence/news-feed.json` |
| netkeiba | TODO | CORS / 利用規約 |
| JBIS | TODO | CORS / 利用規約 |
| 競馬ラボ | TODO | 未接続 |
| ウマークス | TODO | 未接続 |
| ウマニティ | TODO | 未接続 |
| X | TODO | API キー必須 |
| YouTube | TODO | API キー必須 |

### 取得フロー

1. `buildIntelligencePacket()` → Intelligence Manager が各 Provider を優先順位順に実行
2. **Race / Horse / History Collector** が項目を抽出
3. **Data Validator** が不足・欠損・異常値・重複を検出
4. **Cache**（TTL / 更新日時 / 差分ハッシュ）へ保存
5. **AI Preprocessor** が共通モデルへ変換（Horse / Race / Odds / History / Track / Weather / Comment / Trend）
6. 既存 AI エンジンへは従来どおり legacy データを渡し、予想ロジックは不変

### Collector 項目

- Race: 開催日 / 競馬場 / レース番号 / レース名 / 距離 / 芝・ダート / 馬場状態 / 発走時刻
- Horse: 馬番 / 馬名 / 性齢 / 斤量 / 騎手 / 調教師 / 所属 / 人気 / オッズ
- History: 着順 / 距離 / タイム / 上がり / 開催 / クラス

### Developer Panel（DEBUG）

- Provider Monitor（状態 / 最終取得 / 件数 / エラー件数 / 応答時間）
- 取得 JSON / Normalizer 結果 / Cache 確認
- Validation サマリ

## AI Intelligence Platform（Ver5.1）

AIは将来的に JRA公式・netkeiba・JBIS・競馬ラボ・ウマークス・ウマニティ・ニュース・X・YouTube などを統合し、**独自AI分析のみをユーザーへ提供**する設計です。  
X / ニュースの生情報は画面表示せず、AI入力専用です。

## 今後の取得予定

- 公式ライセンスフィード / 公開 API への JRAProvider 差替
- 認可済みパートナー API（netkeiba 等）接続
- X / YouTube API（キー管理付き）
- ライブオッズの差分更新頻度向上（Ver5.2 以降の Live Data）

## 確認方法

```bash
python -m http.server 5500
```

1. AI分析画面で独自AI指標を確認
2. DEBUG 時に Provider Monitor / Debug タブを確認
3. JRA / ニュースが ONLINE または READY、他は OFFLINE(TODO) であること
