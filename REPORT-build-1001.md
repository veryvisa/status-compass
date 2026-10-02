# 枫居罗盘第一版施工报告（2026-10-01）

## 深层需求与交付

本站没有把 PR、入籍、税务、医保和养老拆成五套百科。核心交付是一份出入境记录同时进入五把尺子，再按九种真实生活处境给出三步路径。第一版包括天数总账、税务居民事实问卷、福利与医保离境影响器、离境税量级估算、三棵决策树、入籍考试练习与“怎么算的”细则页；输入均留在浏览器。

完成数字：`data/rules.json` 共 56 条，其中 verified 54 条、pending 2 条；已知答案样例 22 个，自动测试 27 项（最终数字以 `npm run check` 输出为准）；入籍题库 135 题，来自 45 个 Discover Canada 事实点的三种练习形态；构建后 20 个 HTML 页面。

线上地址：<https://veryvisa.github.io/status-compass/>。2026-10-01 17:29（温哥华时间）GitHub Pages 构建完成，首页经独立 HTTP 读回为 200，页面标题为“枫居罗盘”；部署分支提交为 `626c6d0126b972b043339d81720b0e341d169b26`。

## 与原设计不同的地方

1. 福利工具不复制 academy 的季度金额与给付表，只判断离境时的资格/通知节点，并把金额测算继续留在 academy。这样不会出现第二套会随季度变化的 CCB/GIS/OAS 金额规则。
2. 题库交付为 135 题，而不是原设计里的 200 题。任务书本轮门是至少 120 题；我用 45 个官方指南事实生成直接题、判断题与章节复习题，先保证每题可追溯，再把独立复判和去重列入下一轮。
3. 视觉没有复刻加拿大移民站的常青等高线。本站使用海图蓝、铜红、同心罗盘刻度与五条航线；同属加拿大站家族，但“进来以后如何长期安排”的面貌更安静、更像规划台。
4. 中加社保协定被明确写成有限的覆盖/免双重缴费协定，不把中国年限自动累计为 OAS/CPP 资格年数。这修正了设计文档中尚未核实的疑点。
5. PR 境外陪同与加拿大企业例外只允许标注，计算时仍按缺席扣除。争议天数留给证据与官员审查，避免工具给出过度自信的达标日。

## 规则、复用与门

规则库逐条包含 `id / claim / value / unit / source_url / source_quote / checked_at / status`。54 条 verified 来自 IRCC、CRA、Service Canada、BC 或 Ontario 官方原文；GST/HST 抵免离境时点和 CPP 海外个案两条尚未核清，保留 pending，构建门不允许页面引用。

复用关系落在 `data/reuse-map.json`。本站继承移民站的 PR/入籍日历口径与纯前端边界，继承身份页“移民身份不等于税务居民”的事实框架，只读参考 academy 的福利金额层，并沿用跨境图谱的离境税次序。以后应让 `ca-immigration-site` 的 status-clock 在构建时读取本站 verified 子集或直接导流到本站；不要再维护两套天数算法。本轮按任务书没有改移民站代码。

`npm run check` 依次执行规则结构/来源/数量门、Node 已知答案测试、Astro 构建、共享主题与体验层、发布门。发布门拦截页面引用 pending 规则、任何表单外发、客户端网络 API、缺手机 viewport、固定宽度造成的静态横向溢出风险。发布前用 Ego Lite 的真实 Chromium 另验了与线上相同的 `dist/`：390px 首页与六个工具均无横向滚动，天数计算后没有跨源资源请求；发布后 HTTP 独立读回为 200。发布后的 Ego Lite 复验真实失败在 `ego_cli bootstrap` 连接层，因此没有把“线上交互复验”冒充为已完成。

## 我最没把握的三处

1. OAS 的“居住年数”由 Service Canada 按 ordinary residence（通常居住）事实认定，不是简单的在加日数除以一年。第一版的小数年只适合规划，下一轮应改成“天数估算 + 居住事实证据清单”。
2. PR 的加拿大企业境外工作、陪同公民/PR 家属例外细节多且判例化。第一版引用 IRCC 官方手册并选择完全不自动加回；可能显得保守，但比错放行安全。
3. 135 道题有章节覆盖与出处，但其中 90 道由 45 个事实转换成判断/复习题，尚未经过两个不同引擎独立作答复判；最可能的问题是重复和个别干扰项过弱，不是考试参数错误。

## 下一轮

- 先做 CBSA 报告专用导入、OAS 居住事实清单、规则到期巡检和题库独立复判；详细理由与门见 `data/suggestions.jsonl`。
- 加入可打印的多情景五年日历，比较“以后不离境／离境三个月／离境一年”，每个情景明确假设，仍保持零上传。
- 等四本 NotebookLM 媒体按下面资料清单建成、转写并逐数字对照 `rules.json` 后，才把音频、视频、信息图或幻灯片挂到页面。

## NotebookLM 四本资料清单

### ① 枫叶卡：保住、续上、放弃

官方资料：IRCC PR status、Guide 5445、Guide 5529（PRTD）、IMM 5782 页面与自愿放弃申请包。

本站页面：`/tools/day-ledger/`、`/how-it-works/`、`/paths/pr-shortfall/`、`/paths/renounce-pr/`、`/sources/`。

### ② 入籍：从天数到宣誓

官方资料：IRCC 成人入籍资格、语言证明、Citizenship test: Study for the test、Discover Canada、放弃公民身份资格页。

本站页面：`/citizenship-test/`、`/tools/day-ledger/`、`/how-it-works/`、`/paths/citizenship-ready/`、`/paths/renounce-citizenship/`。

### ③ 税务居民与离开加拿大

官方资料：CRA Deemed residents、Income Tax Folio S5-F1-C1、NR73、Leaving Canada (emigrants)、Dispositions of property for emigrants。

本站页面：`/tools/tax-residency/`、`/tools/departure-tax/`、`/paths/leaving-canada/`、`/how-it-works/`、`/sources/`。

### ④ 住在哪里决定领什么：福利与居住

官方资料：Service Canada OAS benefit amount、OAS while receiving、OAS toolkit、CRA CCB guide、BC MSP residents、Ontario OHIP eligibility/absence、中加社会保障协定中国页。

本站页面：`/tools/benefits/`、`/tools/day-ledger/`、`/paths/senior-parent/`、`/how-it-works/`、`/sources/`。

## 回退

源站回退：`git -C /Users/flyabroadca/github/fcgvisa_workspace/status-compass revert ae5b602 d77cca3 8be3122 && git -C /Users/flyabroadca/github/fcgvisa_workspace/status-compass push origin main`。

线上回退：从 GitHub 仓库 `veryvisa/status-compass` 的 `gh-pages` 分支恢复到所需部署提交，再运行 `git -C <部署临时目录> push --force-with-lease origin HEAD:gh-pages`；本版可恢复锚点是 `626c6d0126b972b043339d81720b0e341d169b26`。

门户登记回退：`git -C /Users/flyabroadca/github/fcgvisa_workspace/academy revert 76f76c56`。academy 在本轮开始前已有独立未推提交，因此没有把整条 main 盲推到远端。
