# 枫居罗盘第二轮施工报告（2026-10-01）

## 深层需求与完成结论

第二轮解决的不是“再加几个功能”，而是把第一版从单人日期计算器推进为可供家庭长期维护、能说明规则版本、能接住官方出入境记录、并能把题库交给独立复判的决策档案。六项任务均已实现、逐项测试并分别提交；没有改移民站、没有发论坛帖，也没有调用网页 AI 作答题库。

最终验收：`npm run check` 退出码 0；规则 57 条（verified 55、pending 2）；Node 测试 50 项全部通过；构建 20 个 HTML 页面；可见已知答案样例 32 个（天数样例 28、家庭样例 4），超过任务书要求的 30 个。

## 六项交付

1. **省医保口径**（`2b770da`）：OHIP 改为任意连续 12 个月至少在安省 153 天；新居民/重新取得资格者另验最初 183 天中至少在省 153 天。任务书中的“首 212 天中 183 天”并非当前官网写法；212 天是连续 12 个月中最多可离省天数的反向表达，本站没有照抄成另一条资格规则。BC MSP 保留“每个日历年至少在 BC 住满 6 个月”的月口径，并分开写普通最长 7 个月假期与获批后最长 24 个月延长离境。两省规则及差异已写入“怎么算的”。
2. **家庭文件**（`6cd6ebe`）：加入版本化家庭 JSON，一个文件可存多成员，每人各有并列时间线；旧单人 JSON 可继续导入，单成员导出仍兼容旧格式，多成员导出使用 v2。公民配偶陪同必须由用户勾选、声明关系并有重叠行程才显示标注，仍不自动给 PR 加回天数。
3. **规则生效日**（`021d2e8`）：57 条规则均有 `effective_from`，可选 `rule_key` 与 `superseded_by`；计算按判断日选择当时版本，来源页显示“本规则自 X 起”。verified 规则缺 `effective_from` 时，构建前的规则门直接失败；日期切换有已知答案测试。
4. **OAS 居住事实**（`1a9f3b3`）：删除小数年和按小数年推断未来达标日，只显示天数线索，并提供住房、家庭、生活重心等 6 类 ordinary residence（通常居住）证据清单；明确 Service Canada 才能按全部事实认定。
5. **CBSA 导入**（`5fbb925`）：加入按成员导入的手动列解析器，接受逗号、分号或制表符分隔的 `direction,date,port`，日期只接受 `YYYY-MM-DD` / `YYYY/MM/DD`，方向只接受 entry/exit 或入境/出境。字段、日期、方向、排序或进出境序列含糊时整批拒绝并保留原记录。CBSA 官方只稳定说明报告可含入境、离境或两者以及 15 年保留期，未找到可作为契约的统一下载表格样例，所以没有虚构“官方 CSV 格式”。
6. **题库复判准备**（`0e0258f`）：135 题拆成 5 批，批量分别为 30、30、30、30、15；批次仅含题干和选项，不含答案。`scripts/quiz-crosscheck.mjs` 可读取独立答案并输出分歧题清单，脚本本身已有解析、漏答、非法选项与分歧测试。

## 官方口径与版本边界

OHIP 依据 Ontario 的 Apply for OHIP 页面；MSP 居住规则依据 BC Eligibility and enrolment 页面，延长离境依据 MSP Group Procedure Guide；OAS 依据 Service Canada benefit amount 与 OAS toolkit；CBSA 报告边界依据 Travel History Report 页面。所有 URL、摘录、核查日和状态都在 `data/rules.json`，页面只读取 verified 条目。

本轮给现有规则统一写入的 `effective_from: 2026-10-01` 是“本站开始以版本化规则提供判断”的基线，不冒充每条法规的历史立法生效日。判断日早于本站已有版本时，代码保留明确的早期回退说明，页面要求回官方原文核实；待以后取得历史版本与真实生效日，再用相同 `rule_key` 添加旧版本。

## 题库复判文件

- `data/quiz-review/batch-01.md`：第 1–30 题
- `data/quiz-review/batch-02.md`：第 31–60 题
- `data/quiz-review/batch-03.md`：第 61–90 题
- `data/quiz-review/batch-04.md`：第 91–120 题
- `data/quiz-review/batch-05.md`：第 121–135 题

独立作答应保存为 JSON；完成后运行：

```bash
npm run quiz:crosscheck -- <回答文件一.json> <回答文件二.json>
```

脚本会按题号与正式答案比较，并列出漏答、非法选项、各引擎与标准答案的分歧；它不调用任何网页 AI。

## 验收与上线证据

`python3 bin/preflight.py` 退出码 0。`npm run check` 退出码 0，输出为 57 条规则、55 条 verified、2 条 pending、135 道题、50 项测试通过、20 页构建完成；发布门确认 pending 引用 0、外发 form 0、客户端网络 API 0、静态移动端溢出风险 0。

六项功能源码锚点为 `0e0258f578e52c4439a3cdf6dd7c821a4d925ba5`；GitHub Pages 部署提交为 `19470eb2414fc2d34c641b44e6e180c12d864da4`。Pages API 显示该提交构建完成。带缓存破除参数读回首页、天数总账、“怎么算的”和来源页均为 HTTP 200；线上 HTML 已读到“家庭天数总账”“CBSA Traveller History 手动列导入”“OAS 只显示天数线索，不换算小数年”和“本规则自 2026-10-01 起”。

本轮尝试用 Ego Lite 做线上浏览器交互验收时，真实失败为 `Failed to connect to ego_cli bootstrap`，并伴随 macOS HIServices 错误。因此本报告只确认自动测试、构建门、Pages 构建与 HTTP/页面语义读回，不把线上 Chromium 交互冒充为已验证。

## 我最没把握的三处

1. `effective_from` 的 2026-10-01 是本站规则版本基线，不是 57 条法规各自的历史生效日；对早于该日的回溯判断，最安全动作仍是查当时官方文本。
2. CBSA 没提供可稳定引用的统一下载列格式或脱敏样例；当前手动列解析器故意很窄，真实报告如果列名、时区或排序不同，需要先脱敏后补解析夹具。报告缺记录也不能证明没有旅行。
3. Ego Lite bootstrap 本轮无法连接，线上交互没有真实浏览器复验；目前最强证据是 50 项测试、完整构建门和四页 HTTP/关键语义读回。

## 复盘与留痕

- 差点把任务书的“首 212 天中 183 天”当成 OHIP 官方原句；以 Ontario 原文复核后改为首 183 天在省 153 天，并把 212 天只保留为年度最多离省天数的反向理解。已落入规则、测试和本报告。
- 规则版本不能只多一个字段，必须由构建门和计算选择器共同执行；缺字段失败、日期切换和来源页展示均已有测试，避免“文档里有、程序没用”。
- 一次 HTTP 循环把 zsh 特殊变量 `path` 当普通变量，导致该子 shell 的 PATH 被覆盖；已改用 `route_name` 重跑并得到四页 200。以后 shell 循环不再使用 `path` 作为变量名，本条已落入交接文件。

## 回退

六项源码回退（按新到旧）：

```bash
git -C /Users/flyabroadca/github/fcgvisa_workspace/status-compass revert 0e0258f 5fbb925 1a9f3b3 021d2e8 6cd6ebe 2b770da
git -C /Users/flyabroadca/github/fcgvisa_workspace/status-compass push origin main
```

线上回退：在独立临时克隆中把 `gh-pages` 恢复到第一版锚点 `626c6d0126b972b043339d81720b0e341d169b26`，确认远端分支后执行 `git push --force-with-lease origin HEAD:gh-pages`。不要在共享源码工作区直接切换或强推部署分支。
