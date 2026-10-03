# hk-compass-expiry-1003 收尾报告

## 结论

S02 的纯本地日期层已经完成，但 S02 仍保持 `next`，没有标成 done。本轮没有联网抓官网、没有建立内容哈希监测，也没有修改规则的 `status`、`verified` 或 `value`。

以 `2026-10-03` 为计算日、维护间隔 30 天运行：输入 173 条规则，173 条各自只进入一个主分类；0 条到期，171 条 current（70 个来源），2 条 pending，日期缺失、无效日期、未来 `checked_at`、来源缺失均为 0。两条 pending 为 `pending.cpp_abroad` 和 `pending.gst_credit_absence`。

维护间隔只是“该重新阅读来源”的本地候选门，不是法律有效期。边界固定为 `age_days >= max_age_days`；脚本只读 `checked_at`，绝不拿 `effective_from` 顶替。当前规则的 `checked_at` 多为 2026-10-01，因此 30 天门最早会在 2026-10-31 命中；这不表示任何规则在此前或此后具有法律效力。

## 复用与新增

复用：

- `data/suggestions.jsonl`：确认 S02 的目标、护栏和 `next` 状态。
- `REPORT-round3-1001.md`：沿用“核验基线不能冒充历史生效日”的警示，没有重做 116 条规则核源。
- `batches/handoff/LATEST.md`：确认第三轮已有 173 条规则及继续工作的边界。
- `data/rules.json`：只读输入；运行前后 SHA-256 都是 `5151ed84954375ab1d226f7489323fa1213e2e23a42c02f6a9719ca1cdb42ea8`。
- `scripts/validate-rules.mjs`：沿用现有规则库验证门。

新增：

- `scripts/rules-expiry.mjs`：零网络 CLI，接收 `--rules`、`--as-of`、`--max-age-days`、`--out`；输入或参数错误 rc=2，正常分类（包括存在待复核项）rc=0。
- `tests/rules-expiry.test.mjs`：覆盖到期前一天／当天／后一天、闰日、坏日期、未来日期、pending、同 URL 多规则、输入不变、坏参数与坏 JSON 的 rc=2。
- `reports/rules-expiry-2026-10-03.json`：带输入 SHA-256、计算日、维护间隔、分类优先级、分类计数及稳定排序的纯本地快照。

分类为不重不漏的主分类，优先级随 JSON 报告落盘：pending → 来源缺失 → 日期缺失 → 无效日期 → 未来日期 → due → current。due/current 以 `source_url` 聚合，每组保留排序后的全部 rule id 和各自 `checked_at`、`age_days`。这个优先级只用于让坏输入也能得到唯一统计，不表示被较早分类的问题没有别的字段风险。

## 实际命令与退出码

```text
python3 ../bin/prior_work.py --limit 20 rules-expiry
rc=1；近 14 天命中 0 个。

rg -n "rules-expiry|S02|expiry|规则到期|复核" ../fcgbbs/data/codex_fill/queue*.jsonl
rc=0；只命中 queue-hk.jsonl 中本任务 hk-compass-expiry-1003，没有同题完成报告。

node --test tests/rules-expiry.test.mjs
rc=0；6 tests，6 pass，0 fail。

npm test
rc=0；59 tests，59 pass，0 fail。

node scripts/rules-expiry.mjs --rules data/rules.json --as-of 2026-10-03 --max-age-days 30 --out reports/rules-expiry-2026-10-03.json
rc=0；input_rules=173，categorized_rules=173，pending=2，due=0，current=171。

node scripts/validate-rules.mjs
rc=0；rules=173，verified=171，pending=2，questions=135。

同参数重复生成快照
rc=0；重复运行前后 SHA-256 均为 `ad1f7666aac88e2b200f9c54ce2ac0dc8ff8a25a2a241fe8efc2ffbdad6465ff`。

node --check scripts/rules-expiry.mjs
rc=0。
```

## 仍阻塞项

- S02 的下一层仍是联网读取官方来源、记录内容哈希，并在哈希变化后转人工核读。本轮按方案 B 明确不做，因此不能宣称完成在线监测，也不能把 S02 标 done。
- 113 条新增规则中多数 `effective_from: 2026-10-01` 仍只是第三轮核验基线。若计算器要回答历史日期，仍需另行取得法规当时版本和真实生效日；本地复核到期脚本不能补足这项证据。
- 本快照只回答“按给定间隔哪些来源该再读”，不回答来源内容是否改变，也不判断规则是否继续有效。

## 我最没把握处

我最没把握的是异常字段同时出现时维护者期望的展示方式。本轮为保证分类计数严格不重不漏，采用并写明了固定主分类优先级；例如 pending 同时缺来源时会先列入 pending，而不会重复计入来源缺失。生产数据当前没有这种重叠异常，测试锁住了现行语义，但将来若维护者更需要“一个规则同时报多个问题”，应另增独立的 issue 索引，不能直接破坏主分类总数守恒。

第二个不确定点是 30 天是否最终维护周期；它由调用者明确传入，本轮没有把它写成法律含义或仓库永久配置。

## 可恢复方式

本轮没有修改 `data/rules.json`，也没有外部副作用。若要完全撤回，只需删除本任务新增的四个入库文件：脚本、测试、快照和本报告；无需恢复规则数据、依赖、排程或线上状态。若只需更新计算日或间隔，重新运行脚本写到新的日期化报告路径即可，旧快照可保留作审计。

## 收工自问

- 系统健康吗：本地规则验证门和新增日期门均 rc=0，173 条分类守恒，规则输入哈希不变。
- 有哪些问题：尚无在线内容哈希层；历史生效日证据缺口仍在；异常重叠目前采用单一主分类。
- 怎么改进：后续在线层应复用本报告的 URL 聚合结果，只抓官方页；哈希变化只排人工核读，不自动改 verified。
- 怎么最高效：月巡检先运行零网络日期门，只有 due 来源进入联网队列，同 URL 一次读取覆盖其全部 rule id，避免重做 116 条逐规则核源。
