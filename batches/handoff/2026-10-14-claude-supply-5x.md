# 枫居罗盘 · 建议 S01–S05 落地交接（2026-10-14，Claude 接 Codex 批 claude-status-compass-suggestion-5x-8ce3c3c1bf）

重启后第一条命令：`python3 bin/preflight.py`（含规则到期门，checked_at 超 90 天即 rc=1），再 `npm run check`。

## 本批做了什么
- S01 CBSA 导入向导：入境表、出境表可分开粘贴；认英/法文月份名与“2025年3月1日”；纯数字日期必须选日/月顺序，不猜；姓名、证件号等列直接丢弃；缺出境的入境只列出不配对；先预览再替换。`src/lib/cbsa-import.mjs::parseCbsaSplit/parseTravelDate`。
- S02 规则到期巡检：`npm run rules:watch`（`scripts/source-watch.mjs`）逐页核 source_quote 是否仍在原页、正文哈希是否变；`npm run rules:due` 与 preflight 的到期门。永不改 rules.json。基线 `data/source-watch-baseline.json`（58 页）。
- S03 OAS 居住证据：`data/oas-residence-evidence.json`（条例第 21 条＋Canada.ca 申请页，引文已逐条核在原页）；工具新增“短离开不算中断时”的天数与逐段离境判读。
- S04 题库去重：复习题改为反向辨认；`npm run quiz:dedupe` 进 check；`data/quiz-paused.json` 暂停表，`quiz:crosscheck -- --write-paused data/quiz-paused.json a.tsv b.tsv` 写入。
- S05 情景分叉：`src/lib/scenarios.mjs`，工具页底部三情景并排＋五年月历＋打印。

## 待人处理
- `reports/source-watch-2026-10-14.json` 的 `needs_reread`：11 页引文不在原页（多为当初转述而非原文）、1 页（深圳公安）SSL 握手失败。人工按原页改 rules.json 的 source_quote 后，`node scripts/source-watch.mjs --out reports/source-watch-<日期>.json --accept <url>` 收进基线。
- 题库 135 题仍待两个不同引擎独立作答（批次已按新题重生成在 `data/quiz-review/`）。
- `data/suggestions.jsonl` 有他人未提交改动，本批未动；S02/S05 状态待中心更新。

## 定时
- rules:watch 建议每月跑一次；本批未装 launchd（任务书禁止），需中心登记运行物后再挂。
