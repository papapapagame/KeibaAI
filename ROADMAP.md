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

## Ver7.1 - Race Calendar Intelligence（実装済）

テーマ：開催日・開催場・分析可能段階をAIが理解する

### 実装内容

- RaceCalendarEngine / RaceDateManager / VenueManager / RaceSessionManager / CalendarValidator
- 開催日のみ選択可能なカレンダー UI（非開催日グレーアウト）
- 日付に応じた開催場自動切替・開催情報表示
- Analysis Stage0〜7 と暫定評価（未確定情報は確定扱いしない）
- Confidence / Data Completeness / AI通知
- Mock Calendar（Real は Provider未接続）

### 目標

実データ移行後も自然に動作する開催カレンダーと分析段階の基盤を完成させる。

---

## Ver7.2 - Smart Update Engine（実装済）

テーマ：AIが最適なタイミングで自動的に再分析する

### 実装内容

- SmartUpdateEngine / UpdateScheduler / EventWatcher / RefreshManager / AnalysisTrigger / UpdateHistoryManager
- 曜日・発走タイミング別スケジュール（Mock）
- Critical〜Low 優先度と差分検知（変更なしはスキップ）
- Update Dashboard（`update.html`）
- AI Update Reason 表示・Stage連携・Dev Panel（Auto / Mock Events）

### 目標

無駄な再分析を避け、更新理由が説明可能な更新システムを実現する。

---

## Ver7.3 - Race & Horse Data Integration（実装済）

テーマ：実データ接続へ向けた Race / Horse 共通基盤

### 実装内容

- RaceDataManager / HorseManager と Mapper・Validator・Repository
- Unified Model 正式実装（Jockey / Trainer / Odds 等）
- Provider差異吸収（JRA / netkeiba / JBIS / Mock）
- Data Status（〇△×）と Data Completeness
- AI は RaceDataManager → Unified Model 経由のみ

### 目標

Provider を切り替えても AI 側修正が不要なデータ基盤を完成させる。

---

## Ver7.4 - Provider Integration Framework（実装済）

テーマ：複数のデータ取得元を安全に統合する

### 実装内容

- ProviderManager / Registry / Factory / Loader
- ProviderHealthChecker / ProviderLogger
- 共通 Provider Interface（Race〜Market）
- Priority / Failover / Data Merge / Provenance
- Mock 完全対応、他 Provider は接続口のみ
- AI・画面は Framework 経由のみ（直アクセス禁止）

### 目標

Provider 追加・削除しても AI・画面・モデル側の修正が不要な拡張基盤を完成させる。

---

## Ver7.5 - Race Data Connect（実装済）

テーマ：開催情報・レース情報の実データ接続（第一段階）

### 実装内容

- RaceDataConnector / Fetcher / Parser / Synchronizer / Monitor
- Race 情報のみ（Horse / Odds 対象外）
- Provider → Normalizer → Validator → Unified → AI
- Calendar / Smart Update 連携
- Mock / Real / Auto 切替維持

### 目標

開催・レース基本情報を安全に接続し、将来の実 Provider 追加に備える。

---

## Ver7.6 - Horse Entry Intelligence（実装済）

テーマ：登録馬・出走予定馬・確定出走馬を管理する

### 実装内容

- HorseEntryManager / Repository / Synchronizer / Validator / StateManager / Formatter
- Entry Status（Registered / Entry Expected / Confirmed / Scratched / Excluded / Withdrawn）と変更履歴
- Analysis Stage 連携（Stage1登録 / Stage2予定 / Stage3+確定待機）
- Validation・Data Completeness・Confidence 反映
- Smart Update / Calendar（開催日・開催場）連携
- 枠・馬番・騎手・斤量・オッズは未確定扱い

### 目標

登録情報と確定情報を明確に区別し、暫定段階の誤用を防ぐ。

---

## Ver7.7 - Draw & Jockey Intelligence（実装済）

テーマ：枠順・馬番・騎手・斤量などの確定情報を管理する

### 実装内容

- DrawManager / JockeyManager / WeightManager / Synchronizer / Validator / StateManager
- Stage3 枠順 / Stage4 騎手 / Stage5 斤量（確定時のみ AI 反映）
- 枠順・騎手・斤量・乗り替わり・取消・除外補正（エンジン非改変）
- Smart Update（変更時のみ再分析）/ Validation / Completeness
- Entry（Ver7.6）連携を維持

### 目標

確定情報のみを AI へ反映し、未確定の推測補完を防ぐ。

---

## Ver7.8 - Odds & Market Intelligence（実装済）

テーマ：オッズ・人気・市場情報をAI分析へ反映する

### 実装内容

- OddsManager / Repository / Synchronizer / Validator / HistoryManager / MarketAnalyzer
- Market / Support / Value Score（人気順への単純依存なし）
- Stage6 前日オッズ / Stage7 最新オッズ
- Smart Update（オッズ・人気・市場指数の変更時のみ）
- Validation / Completeness（ニュース・SNSは 0%）
- Draw / Entry 連携を維持

### 目標

市場情報を補助要素として扱い、単純な人気追従分析を避ける。

---

## Ver7.9 - Weather & Track Intelligence（実装済）

テーマ：天候・馬場状態・気象情報をAI分析へ反映する

### 実装内容

- WeatherManager / Repository / Synchronizer / Validator / HistoryManager / TrackConditionManager
- Track / Weather / Surface Score
- Stage6 前日天候・馬場 / Stage7 当日最新
- 天候・馬場・風・芝ダート・含水率補正（統合・エンジン非改変）
- Smart Update（変更時のみ）/ Validation / Completeness
- Odds / Draw / Entry 連携を維持

### 目標

天候・馬場を単独要因にせず、他分析要素と統合して評価する。

---

## Ver8.0 - News Intelligence（実装済）

テーマ：ニュース情報をAI分析へ取り込む（本文非転載）

### 実装内容

- NewsManager / Repository / Synchronizer / Validator / Normalizer / ScoringEngine
- カテゴリ正規化・News Score（Freshness / Importance / Reliability / Coverage）
- 構造化メタデータのみ AI 反映（本文・画像・SNS禁止）
- Smart Update（新着・更新・取消・重要ニュース）
- Unified Model `News` 統合
- Analysis / Dev Panel 表示（タイトルのみ）

### 目標

公開情報を安全に構造化し、転載リスクなく AI 補助情報として利用する。

---

## Ver8.1 - Social Intelligence（実装済）

テーマ：SNS情報をAI分析用データとして構造化する（投稿非転載）

### 実装内容

- SocialManager / Repository / Synchronizer / Validator / Normalizer / ScoringEngine / TrendAnalyzer
- カテゴリ正規化（調教・馬体・騎手・パドック・取消・人気・開催・その他）
- Trend / Attention / Momentum / Confidence Score
- 構造化メタデータのみ AI 反映（投稿本文・画像・動画・コメント禁止）
- Smart Update（新規話題・スパイク・重要カテゴリ・トレンド変化）
- Unified Model `Social` 統合（News と併存）
- Analysis / Dev Panel 表示（メタ・件数のみ）

### 目標

SNSを安全に構造化し、News と合わせて AI が総合評価できる基盤を構築する。

---

## Ver8.2 - AI Discussion Engine（実装済）

テーマ：複数のAI評価を統合・比較・議論して最終判断を行う

### 実装内容

- DiscussionManager / Engine / EvidenceCollector / ConflictResolver / ConsensusEngine / ReasoningBuilder / Validator
- Evidence 収集（Horse〜Learning）と品質スコア（Confidence / Freshness / Reliability / Coverage / Importance）
- 矛盾解決（信頼度・更新時刻・重要度・取得率）— 単純平均・加算ではない
- Consensus / Agreement / Conflict / Final Confidence
- Reasoning（一致・矛盾・採用・除外）を Unified Model へ統合
- Analysis / Dev Panel 表示

### 目標

情報源の一致と矛盾を明示し、根拠付きで最終評価の信頼度を高める。

---

## Ver8.3 - Prediction Explainability（実装済）

テーマ：AI予想の根拠をユーザーへ分かりやすく説明する

### 実装内容

- ExplainManager / PredictionExplainer / EvidenceExplainer / ReasonBuilder / ContributionAnalyzer / ConfidenceExplainer / Validator
- Discussion 採用 Evidence に基づく説明（推測禁止）
- 寄与率14要素・合計100%
- Prediction Diff（順位・Confidence・Evidence）
- Unified Model（Explain / Contribution / Diff / Reason / Evidence / Confidence）
- Analysis / Dev Panel 表示

### 目標

「なぜこの予想になったのか」を透明に示し、ユーザーの理解を最優先する。

---

## Ver8.4 - Knowledge Graph（実装済）

テーマ：全データを Knowledge Graph として統合し AI 推論へ活用する

### 実装内容

- KnowledgeGraphManager / Node / Edge / Indexer / Query / Validator / Synchronizer
- Node・Edge 関係モデルと Graph Intelligence スコア
- Query（関連・履歴・近似・関連度・重要度）
- Discussion / Explain / Learning / Prediction が Graph 経由で関連取得
- Unified Model 統合・Analysis / Dev Panel 表示

### 目標

表示用ではなく、AI 判断の共通推論基盤として全データを結びつける。

---

## Ver10.6 - Production Integration（実装済）

テーマ：全 Real Provider を統合し、本番運用可能な状態へ仕上げる（新機能なし）

### 実装内容

- Provider Integration（Race / Horse / Odds / Weather / News / Social + Mock 維持）
- Production Health（System / Provider / Cache / Memory / Update Queue / Error）
- Smart Update・Cache TTL・Prefetch 重複防止の統合確認
- Analysis / Developer Panel に本番ヘルス表示
- README を本番向け最終構成へ更新

### 非対象

- 新機能追加なし
- `ai-engine.js` / `thinking-engine.js` 非改変

---

## Ver10.5 - Real Social Intelligence（実装済）

テーマ：SNSトレンド情報を Real Data 化する（投稿本文・画像・動画は取得しない）

### 実装内容

- RealSocialProvider（Fetch / Parse / TrendMetadataExtractor / Normalize / Validate / Synchronize）
- Social Intelligence（Ver8.1）連携・Trend/Attention/Momentum/Confidence を実データ算出
- Smart Update: 急上昇・カテゴリ変化・投稿数急増・重要トレンド変更時のみ再取得
- 失敗時は Mock 自動切替なし（「SNS情報を取得できませんでした」）

### データ

- Mock: `data/social/mock-social.json`（維持）
- Real: `data/social/real-social.json`

---

## Ver10.4 - Real News（実装済）

テーマ：ニュース情報を Real Data 化する（本文・画像は取得しない）

### 実装内容

- RealNewsProvider（Fetch / Parse / MetadataExtractor / Normalize / Validate / Synchronize）
- News Intelligence（Ver8.0）連携・Freshness/Importance/Reliability/Coverage を実データ算出
- Smart Update: 新着・更新・取消・重要ニュース変更時のみ再取得
- 失敗時は Mock 自動切替なし（「ニュース情報を取得できませんでした」）

### データ

- Mock: `data/news/mock-news.json`（維持）
- Real: `data/news/real-news.json`

---

## Ver10.3 - Real Weather（実装済）

テーマ：実際の天候・馬場状態を取得してAIへ反映する

### 実装内容

- RealWeatherProvider（Fetch / Parse / Normalize / Validate / Synchronize / TrackConditionParser）
- Weather Intelligence（Ver7.9）連携・Weather/Track/Surface Score を実データ算出
- Smart Update: 天候・馬場・風向・風速・更新時刻変更時のみ再取得
- 失敗時は Mock 自動切替なし（「天候情報を取得できませんでした」）

### データ

- Mock: `data/weather/mock-weather.json`（維持）
- Real: `data/weather/real-weather.json`

---

## Ver10.2 - Real Odds（実装済）

テーマ：実際のオッズ・人気を取得してAIへ反映する

### 実装内容

- RealOddsProvider（Fetch / Parse / Normalize / Validate / Synchronize / History）
- Odds Intelligence（Ver7.8）連携・Market/Support/Value Score を実データ算出
- Smart Update: 単勝・複勝・人気・更新時刻変更時のみ再取得
- 失敗時は Mock 自動切替なし

### データ

- Mock: `data/odds/mock-odds.json` / `data/horses.json`（維持）
- Real: `data/odds/real-odds.json`

---

## Ver10.1 - Real Horse Entry（実装済）

テーマ：実際の出馬表を取得し AI へ渡す

### 実装内容

- RealHorseProvider（Fetch / Parse / Normalize / Validate / Synchronize）
- Horse Entry Intelligence（Ver7.6）連携・Registered〜Withdraw 維持
- Stage2〜5 で登録馬 / 確定出馬表 / 騎手 / 斤量を実データ反映
- Smart Update: 取消・除外・騎手変更・斤量変更・出馬表更新時のみ再取得
- 失敗時は Mock 自動切替なし（「出馬表を取得できませんでした」）

### データ

- Mock: `data/horses.json` / `data/entry/mock-entries.json`（維持）
- Real: `data/entry/real-entries.json`（URL は config で差し替え可）

---

## Ver10.0 - Real Race Calendar（実装済）

テーマ：実際の開催日・開催場・レース一覧を取得する（Mock→Real 第一段階）

### 実装内容

- RealRaceProvider（Fetch / Parse / Normalize / Validate / Synchronize）
- ProviderManager で Mock / Real 切替（失敗時は自動Mock切替なし）
- Real 開催日のみ選択可・その日の開催場のみ表示
- レース一覧を 1R→12R / 発走順で表示
- Unified Model（Calendar / Schedule / Venue / Race / AnalysisStage）統合
- Smart Update: 開催情報変更時のみ同期
- Analysis / Developer Panel に Provider 状態表示

### データ

- Mock: `data/calendar/mock-calendar.json`（維持）
- Real: `data/calendar/real-calendar.json`（GH Pages 対応。URL は config で差し替え可）

---

## Ver9.0 - Release Candidate（実装済）

テーマ：製品版リリース前の最終統合・品質向上・最適化（新機能なし）

### 実施内容

- 全 Engine 連携確認・依存の一方向維持
- Prefetch / Smart Update 重複抑制・Knowledge 再同期スキップ
- ServiceGuard（例外・タイムアウト・Recovery）
- UI レスポンシブ微調整・RC 表示（Version / Build）
- README 最終版

### 判定

Release Candidate として GitHub Pages 上での安定動作を目標とする。

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

## Ver9.1+ / Premium AI（将来構想）

テーマ：次世代AI分析（Ver9.0 RC 以降の拡張案）

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

## Ver10.0 - Official Release（将来）

テーマ：正式リリース（Real Race Calendar 基盤の上に構築）

### 実装予定

- Real Provider の本接続拡大（Horse / Odds / Weather 等）
- UI最終調整 / レスポンス最適化
- PWA対応 / SEO / アクセシビリティ
- エラーゼロ運用ゲート
- README 運用版最終更新

### 目標

製品版として安定公開する。

---

## 開発方針

- Ver5.0でAI体験を完成させる。
- Ver5.1〜5.3で実データ連携とAI分析の基盤を構築する。
- Ver5.4でAI馬券アシスタントを実装する。
- Ver6.0で自己学習AIへ進化させる。
- Ver9.0 Release Candidate で製品版前の品質統合を完了する。
- Ver10.0 Real Race Calendar で Mock→Real 第一段階を完了する。
- Ver10.1 Real Horse Entry で出馬表の Real 化を完了する。
- Ver10.2 Real Odds でオッズ／人気の Real 化を完了する。
- Ver10.3 Real Weather で天候／馬場の Real 化を完了する。
- Ver10.4 Real News でニュースメタデータの Real 化を完了する。
- Ver10.5 Real Social で SNS トレンドメタデータの Real 化を完了する。
- Ver10.6 Production Integration で全 Real Provider 統合・本番品質化を完了する。
- Ver9.1+ / 以降で高度なAI分析機能を追加する。
- 正式リリース版へ向けて Real Provider を拡張する。
