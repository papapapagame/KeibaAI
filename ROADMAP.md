# PAPAPA IQ KEIBA Development Roadmap

## Ver5.0 - AI Experience Update

テーマ：AI体験の完成

### 実装内容

- AI対決モード
- AI思考ログ
- AIニュース
- AIランキング
- AI信頼度履歴
- 分析演出強化
- 黒×金デザインブラッシュアップ
- スマホ最適化
- トップページへ戻るボタン

### 目標

「AIが本当に競馬を分析している」と感じられる体験を完成させる。

---

## Ver5.1 - AI Intelligence Platform（実装済）

テーマ：AI情報収集プラットフォーム基盤 + 実データ連携の土台

### 実装内容

- Real Data Foundation（Dummy / CSV / API / JRA Provider 切替設計）
- Intelligence Provider 方式（JRA / netkeiba / JBIS / 競馬ラボ / ウマークス / ウマニティ / ニュース / X / YouTube）
- Intelligence Manager（登録・有効無効・優先順位・キャッシュ・取得状況）
- Data Normalizer（Horse / Race / Odds / News / Comment / Trend / Sentiment / Analysis）
- AI Intelligence Layer（情報源統合 → 独自指標ダミー）
- X / ニュース分析基盤（AI入力専用・非表示）
- Developer Panel（情報源 ONLINE/OFFLINE/READY/ERROR・取得ログ）
- ※ 実スクレイピング / API 接続は未実施（すべてダミー）

### 目標

将来、各 Provider を実装するだけで複数情報源を統合し、独自AI分析のみをユーザーへ提供できる。

---

## Ver5.2 - Real Intelligence Connect（実装済）

テーマ：実データ接続

### 実装内容

- JRA / ニュース Provider の同一オリジン実装（他は TODO）
- Race / Horse / History Collector
- Data Validator（不足・欠損・異常値・重複）
- Cache 強化（TTL / 更新日時 / 差分更新）
- Provider Monitor（応答時間・エラー件数）
- AI入力前処理（共通モデル変換）
- Debug（取得JSON / Normalizer / Cache）

### 目標

実装可能な情報取得を接続し、将来の外部 Provider 追加だけで実データへ拡張できる。

---

## Ver5.3 - AI Intelligence Engine（実装済）

テーマ：AI分析エンジン

### 実装内容

- services/ai 独立 Analyzer 群
- IQ Score および衛星スコア生成
- Explainable AI（評価根拠）
- AI Confidence
- 可変 AI コメント
- AI REPORT（総評・展開・危険/穴・EV・買い目）
- ※ 既存 ai-engine / thinking-engine は未変更

### 目標

取得情報を統合し、PAPAPA IQ 独自の指数・根拠・レポートを生成する。

---

## Ver5.4 - Market Intelligence AI（実装済）

テーマ：市場心理（Market Intelligence）の分析

### 実装内容

- services/market Market Intelligence Engine
- Sentiment / Trend / Buzz / News / Social / TipSite Analyzer
- Market Score（Support / Buzz / Risk / Trend / Confidence / Heat / Expectation / Value Opportunity）
- Market Dashboard（ゲージ）
- Explainable Market AI
- Final IQ Score（能力系 Analyzer + Market 統合）
- Developer Panel（Market Analyzer 状態）
- ※ 記事・投稿・予想サイト本文は非表示（AI評価のみ）
- ※ 既存 ai-engine / thinking-engine は未変更

### 目標

市場心理を解析し、独自の Support / Buzz / Risk 等と Final IQ を生成する。

---

## Ver5.5 - Learning AI Engine（実装済）

テーマ：自己学習AI基盤

### 実装内容

- services/learning（LearningEngine / ResultAnalyzer / WeightOptimizer / AccuracyTracker / PerformanceAnalyzer / LearningHistory）
- Learning Database（localStorage、Version管理）
- AI Performance 画面（成績・Analyzerランキング・Dashboard・Explain Learning）
- 重みは手動調整・提案のみ（予想ロジック自動書換は禁止）
- ※ 既存 ai-engine / thinking-engine / js/learning-engine.js は維持

### 目標

結果を蓄積し、将来Ver6.0で安全に重み反映できる自己学習基盤を完成させる。

---

## Ver6.0 - Betting Intelligence AI（実装済）

テーマ：AI馬券戦略システム

### 実装内容

- services/betting（BettingEngine / TicketGenerator / ValueAnalyzer / RiskAnalyzer / BankrollManager / CombinationOptimizer）
- 全券種（単勝・複勝・馬連・馬単・ワイド・三連複・三連単）＋フォーメーション
- 買い目比較（AI案 / 安全 / 期待値 / 穴 / バランス）
- 資金配分AI・Explain Betting・Confidence
- Betting Dashboard / 保存・お気に入り・CSV・JSON
- ※ 既存 ai-engine / thinking-engine は未変更

### 目標

「どう買えば期待値が高いか」を独自指標の統合判断で提案する。

---

## Ver6.1 - Live Data Update

テーマ：リアルタイム競馬データ

### 実装予定

- リアルタイムオッズ
- 人気順位
- 馬プロフィール
- 騎手プロフィール
- 過去成績表示
- コース情報
- AIへのリアルタイム反映

### 目標

常に最新データでAIが分析できる環境を構築する。

---

## Ver6.2 - Safe Weight Apply

テーマ：Learning AI 重みの安全反映

### 実装予定

- Ver5.5 WeightOptimizer 提案の段階的適用
- ロールバック
- A/B 検証

### 目標

学習結果を予想ロジックへ安全に接続する。

---

## Ver6.3 - Betting AI Advanced

テーマ：AI馬券アシスタント

### 実装予定

- 三連単
- 三連複
- 馬単
- 馬連
- ワイド
- 単勝
- 複勝

さらに

- フォーメーション自動生成
- 資金配分提案
- 点数最適化
- 期待回収率シミュレーション

### 目標

AIによる最適な買い目提案を実現する。

---

## Ver6.5 - AI Race Review & Knowledge Learning（実装済）

テーマ：AIがレースを振り返り、知識を蓄積する

### 実装内容

- RaceReviewEngine / WinnerAnalyzer / LoserAnalyzer / RaceFlowAnalyzer
- KnowledgeManager / LessonGenerator / FuturePredictionManager
- Explain Review（結論＋なぜ）
- Horse AI Memo
- Review Dashboard（`review.html`）
- Learning AI への引き渡し（ロジック非改変）
- 記事・SNS本文は非表示（要約・考察のみ）

### 目標

公開情報を基にした独自考察で Knowledge Base を長期育成する。

---

## Ver7.0 - Real Data Platform Foundation（実装済）

テーマ：AIへ実データを供給するための基盤構築

### 実装内容

- DataProviderManager / Normalizer / Validator / Cache / Scheduler
- ProviderHealthMonitor / ProviderSelector
- MockProvider 実装、他 Provider はインターフェースのみ
- Unified Race Model + API Layer（AI は Provider 直アクセス禁止）
- Data Dashboard（`data.html`）
- Mock / Real / Auto 切替（Real は Provider未接続表示）

### 目標

ダミーから実データへいつでも切り替えられる拡張可能な基盤を完成させる。

---

## Ver6.0 - Learning AI

テーマ：自己学習AI

### 実装予定

- 的中履歴保存
- 回収率保存
- AI精度改善
- 得意条件学習
- AI分析履歴
- ユーザー収支分析

### 目標

AIが予想結果から継続的に学習し、精度を向上させる。

---

## Ver9.0 - Premium AI

テーマ：次世代AI分析

### 実装予定

- AIチャット
- AI実況
- レースシミュレーター
- オッズ変動分析
- リスク分析
- 期待値分析
- 複数AI比較

### 目標

競馬AI分析システムとして最高レベルの体験を提供する。

---

## Ver10.0 - Official Release

テーマ：正式リリース

### 実装予定

- UI最終調整
- レスポンス最適化
- PWA対応
- SEO最適化
- アクセシビリティ改善
- パフォーマンス最適化
- エラーゼロ
- README最終更新
- 正式リリース

### 目標

「PAPAPA IQ KEIBA Version 1.0」として一般公開できる完成度へ到達する。

---

## 開発方針

- Ver5.0でAI体験を完成させる。
- Ver5.1〜5.3で実データ連携とAI分析の基盤を構築する。
- Ver5.4でAI馬券アシスタントを実装する。
- Ver6.0で自己学習AIへ進化させる。
- Ver9.0で高度なAI分析機能を追加する。
- Ver10.0を正式リリース版とする。
