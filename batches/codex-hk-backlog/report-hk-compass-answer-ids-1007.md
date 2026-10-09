# hk-compass-answer-ids-1007 收尾报告

## 结论

方案 B 已完成：`quiz-crosscheck` 现在会在比较前拒绝不能可靠对应题目的 JSON 答案记录。`[{"answer":"A"}]` 不再生成题号 `"undefined"`；缺失、空白、带首尾空白、null、数字、数组或对象型 id，以及重复 id，都会带 JSON 项号得到可读错误。JSON 数组中的 null、数组、字符串或数字项也会在进入比较前被拒绝。

本轮没有生成任何独立作答，没有修改题目、出题策略、正式题库批次或 S04 状态。`data/suggestions.jsonl` 中 S04 仍为 `ready_for_external_answers`；退出码 0 仍只表示比较报告成功生成，不表示题库通过独立终审。

## 查重、复用与新增

开工复跑 `prior_work.py`，专项关键词 `quiz-crosscheck` 在近 14 天命中 0。该工具不扫描 mjs，所以本轮另行直接读取现有库、CLI 和测试，并检查控制塔 backlog、done、队列及目标仓报告。控制塔中存在本任务书、队列项和启动时归档的 done 元数据，但目标仓没有本任务报告，目标代码仍是会把缺失 id 转成 `"undefined"` 的旧实现；开工时目标工作树干净，因此不是可直接复验的既有修复，也没有覆盖并发修改。

复用：

- `src/lib/quiz-crosscheck.mjs` 的文本、JSON map、JSON array 三种输入以及 A-D／1-4 选项归一化。
- `crosscheckQuizAnswers` 原有分歧、缺答和未知题号统计；合法但不在题库中的题号仍进入 unknown。
- `scripts/quiz-crosscheck.mjs` 原有 Markdown 报告结构和 rc=0 正常路径。
- `data/suggestions.jsonl` 的 S04 护栏及 `batches/handoff/LATEST.md` 的第三轮边界。

新增：

- JSON 数组项对象门；id 必须是非空且没有首尾空白的字符串，不再用 `String(id)` 接纳坏类型；重复错误带当前项号。
- 无效 JSON 和标量型 JSON 顶层得到稳定中文诊断。
- CLI 对参数、读取、解析和写入错误统一输出简短的 `错误：…`，rc=2 且不输出堆栈；所有输入成功读取和解析后才写报告，失败时已有输出保持原字节。
- `tests/quiz-crosscheck-cli.test.mjs` 使用系统临时目录和子进程覆盖正常报告、非法 JSON、缺 id、读文件失败、缺 `--out` 值及无输入。
- 库测试补齐两个实伤、null 行、非对象数组项、各种非字符串 id、顶层畸形、重复、三种合法格式、数字选项和合法 unknown。

## 实际命令与退出码

```text
python3 ../bin/prior_work.py quiz-crosscheck --limit 20
rc=1；输出“命中 0 个（近 14 天，显示前 0）”。

rg / find 检查 ../fcgbbs/batches/codex-hk-backlog、done、data/codex_fill/queue*.jsonl 与目标仓 batches/codex-hk-backlog
rc=0；只找到本任务的任务书、队列／done 元数据与运行日志，没有既有目标仓完成报告或重复修复。

node --test tests/quiz-crosscheck.test.mjs tests/quiz-crosscheck-cli.test.mjs
rc=0；10 tests，10 pass，0 fail。

npm test
rc=0；66 tests，66 pass，0 fail。

git diff --check
rc=0。

git diff --exit-code -- data/suggestions.jsonl batches/handoff/LATEST.md src/lib/questions.mjs data/citizenship-question-facts.json data/quiz-review
rc=0；建议状态、交接、题目输入、题目生成器和正式题库批次均未修改。
```

## 未验项目与边界

- 按任务边界没有调用两个外部独立引擎，也没有取得真实独立答案文件。因此没有验证题目答案是否正确、两引擎是否独立，不能宣称 135 题已经审过。
- 没有联网、启动浏览器、构建网站、发帖、部署、push 或修改线上状态；这些都不是本次输入可靠性修复的验收项。
- 没有改变 JSON map 无法表达“同一个键重复两次”的标准解析语义；重复 id 门覆盖文本和 JSON array 中能被解析器保留下来的重复记录。

## 我最没把握处

我最没把握的是“规范字符串”对首尾空白的兼容预期。本轮选择拒绝 `" q1 "`，而不是静默 trim 成 `"q1"`。这是偏保守的输入完整性策略：它能避免两个视觉相似题号在清洗后被偷偷合并，但会拒绝本可人工修正的松散输入。测试已锁定这一行为；若以后要容忍空白，应显式设计“规范化并报告”模式，不能重新用隐式强制转换掩盖输入问题。

## 回退方式

本轮没有外部副作用。若要完全撤回，只需恢复 `src/lib/quiz-crosscheck.mjs`、`scripts/quiz-crosscheck.mjs`、`tests/quiz-crosscheck.test.mjs`，并删除新增的 `tests/quiz-crosscheck-cli.test.mjs` 与本报告。题库输入、正式批次和 S04 无需恢复。

## 后续方向

有依据的下一步仍是 S04 已登记的外部答案阶段：两个不同引擎各自提交带明确题号的答案文件后，复用本工具生成分歧、缺答和 unknown 报告；任何答案不一致的题继续暂停，不应把本轮结构校验当成答案终审。

## 收工自问

- 系统健康吗：只能确认本仓本地输入门和 66 项测试本轮均通过，不能据此推断全线健康。
- 有哪些问题：真实独立答案尚未到位；JSON map 的重复原始键不会被标准 JSON 解析保留。
- 怎么改进：独立答案到位后先过本输入门，再只把分歧题送复判，保留原始答案文件作证据。
- 怎么最高效：继续复用现有比较器，不改题库流程、不重做已完成的第三轮内容工作。
