# PAPAPA IQ KEIBA

**Version 10.8.0 — Production Real Data Integration Complete**  
Build Date: 2026-07-29 · Build Number: 20260729.108

Cursor / GitHub Repository / GitHub Pages のみで動作（独自サーバー・Node・CORSプロキシ不要）。

## Real Data（通常起動は必ず Real）

| Provider | 取得先 |
|----------|--------|
| Race | `data/calendar/calendar.json`（Pages 相対 / raw.githubusercontent.com） |
| Horse | `data/horse/entries.json` |
| Odds | `data/odds/odds.json` |
| Weather | Open-Meteo API（直接） |
| News | Google News RSS → CORS時は `data/news/news.json`（Real・Mockではない） |
| Social | Wikipedia pageviews → 失敗時 `data/social/social.json` |

Mock Provider は削除していません。Developer Panel のみ。失敗時の自動 Mock 切替なし。

## 確認

1. 静的配信（GitHub Pages またはローカル同一オリジン）
2. `production-verify.html` → VERIFY OK
3. `analysis.html?date=2026-07-27&venue=tokyo&race=11`
4. Developer Panel → Live Connection（Mock使用件数 = 0）
