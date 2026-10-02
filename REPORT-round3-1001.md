# 枫居罗盘第三轮施工报告（2026-10-01）

## 深层需求与设计取舍

这一轮要解决的不是“多放一些链接”，而是让读者从首页识别自己的处境后，能在网站内连续完成“看总图—换处境—用工具—读摘要—进入论坛细节”的判断过程。第二轮已有计算器和规则库，但内容仍像孤立框架：卡片点击范围小、处境之间没有连续导航、正文没有真正进入构建链，网站与论坛也没有稳定分工。

两种实现路线中，第一种是把 18 篇内容复制进 Astro 页面组件，短期快，但正文、卡片摘要和页尾关系会形成多份事实源；第二种是让 Astro content collection 直接消费 `content/paths/*.md` 与 `content/guides/*.md`，所有卡片、导航、目录和关系都从 frontmatter 派生。本轮采用第二种。站与论坛的边界定为：处境页在站内完整呈现；专题页在站内呈现可独立使用的 `site_digest`，有 `forum_tid` 时去论坛读完整详解，没有时开放 `/full/` 过渡全文。这样网站负责工具和总图，论坛保留背景、争议与持续讨论。

## 已实现

1. 新增 `paths`、`guides` 两个 content collection，`_` 开头文件不会形成公开路由。9 个处境页渲染完整正文；9 个专题摘要页只渲染 `site_digest`，当前 9 篇都因 `forum_tid` 为空而生成过渡全文。`related_paths`、`related_guides`、`tools`、`forum` 统一生成页尾整卡入口。
2. 首页、处境、专题、工具与算法页的 `.card` 都改为整张 `<a>`；鼠标悬停和键盘聚焦有明确边框、位移和轮廓。首页处境卡直接使用内容 summary，并增加 9 张专题卡。
3. 处境页与专题页顶部都有九处境横向切换栏；处境页高亮当前项，专题页标示相关处境。处境页、专题摘要和过渡全文都有上一篇/下一篇。H2 自动生成宽屏右侧目录与手机顶部折叠目录。
4. 顶部导航固定为“处境 / 工具 / 专题 / 入籍考试 / 怎么算的”，并补齐 `/tools/` 与 `/guides/` 汇总页。

施工开始与结束时对 18 个非下划线正文文件分别计算 SHA-256，文件集合与哈希逐项一致；本轮没有改写 `content/*.md` 正文，也没有发论坛帖。

## 规则合并结果

两个 `_new-rules.jsonl` 共 116 条候选、55 个唯一官方 URL。自动联网核验结果为：92 条摘录精确命中、19 条页面文本归一化后近似命中、4 条摘录未命中、1 个页面抓取失败。后 5 条已重新打开对应政府页面人工复核；另对 OASRI 清单缺席、CPP 外币支付清单和 CGEB 复合陈述做了人工抽查。116 条全部有官方原文支持，合并 116、退回 0，规则库由 57 条增至 173 条，版本为 `2026-10-01.2`。

自动取证逐条结果在 `reports/round3-rule-verification.json`，人工复核在 `reports/round3-manual-verification.json`，零退回台账在 `reports/round3-rejected-rules.json`。青岛税务页面被 429/412 拒绝的住所定义改用国家税务总局同文页面；T1135 重大过失罚款改用 CRA 现行罚款问答页；PR 身份丧失方式与 T2061A 使用现行页面原句。

`cn_ssa.in_force`、`vdp.relief_unprompted`、`cgeb.renamed` 使用原文明确给出的生效日；其余新增规则的 `effective_from: 2026-10-01` 是本站本次核验基线，不冒充法规历史生效日。

## 门的红线

`scripts/content-gate.mjs` 现在会在以下情况退出码 1：处境或专题不是各 9 篇；处境正文汉字少于 1500；正文把 PR 730 天、入籍 1095 天、PR 前 365 天、税务 183 天、18–54 岁、IMM 5782/5783、T1243/T1244 写成与 verified 规则冲突的数；候选规则未被合并、未标 verified、缺 `effective_from` 或值被静默改变。

第一次真实运行抓到 4 个误报：两处把“只靠 PR 后累计的入籍 1095 天”误当 PR 居住义务，两处把同段出现的 T1161/T1243 误当延付表。执法点已收紧为“规则语义＋紧邻表号”，并用一组正确样本、一组错误样本和一组算例样本标定；正确正文通过，错误样本仍报红。

`scripts/gate.mjs` 还直接检查构建产物：9 个处境路由、9 个专题摘要路由、下划线文件不泄漏、每个 `.card` 必须是带 href 的 `<a>`、摘要页必须有论坛/全文动作、处境页和过渡全文必须有双端目录与前后篇、首页必须各有 9 张处境/专题卡、顶部五项导航和键盘 focus 样式必须存在。

## 验收与上线证据

`npm run check` 退出码 0：173 条规则（171 verified、2 个既有 pending）、18 篇内容门通过、53 项测试全过、Astro 构建 40 个 HTML 页面，发布门确认整卡链接、9+9 内容路由、9 个全文过渡页、pending 引用 0、外发 form 0、客户端网络 API 0、静态移动端溢出风险 0。

Ego Lite 真实页面读取确认：处境页有 9 个切换项、当前处境高亮、桌面与手机目录各 12 项、上一篇/下一篇各可达。Ego 的截图 CDP 连续超时；随后 Playwright 自带 Chromium 在当前 macOS 沙箱被 Mach 端口权限拒绝，因此本轮不把截图视觉复判冒充为完成。

源码功能提交为 `752919bb95f3c79f7b1b9f9a7718cd756bf6c55c`，已推送 `main`；GitHub Pages 部署提交为 `43375a5e80f1499db11d258141edcf9a8d071162`。带缓存破除参数读回首页、准备入籍处境页、税务居民专题摘要与过渡全文均为 HTTP 200，并分别读到第三轮标题、摘要转全文提示与“过渡全文”语义。

## 我最没把握的三处

1. 113 条新增规则的 `effective_from: 2026-10-01` 只是本次核验基线；用于历史日期判断前仍需补法规当时版本与真实生效日。
2. OASRI 免申报地区与 CPP/OAS 外币支付地区是以“当前清单中不存在/存在”作出的负面事实判断，现已人工逐项核过，但官方以后增删地区时必须重跑来源核验。
3. 页面语义、响应式 CSS 门与真实 Ego DOM 已验，但本轮没有成功取得浏览器截图；最可能遗漏的是某个极端宽度或长链接下的视觉间距，而不是路由、内容或链接缺失。

## 回退

源码回退：

```bash
git -C /Users/flyabroadca/github/fcgvisa_workspace/status-compass revert 752919b && git -C /Users/flyabroadca/github/fcgvisa_workspace/status-compass push origin main
```

线上回退只在独立临时克隆进行，恢复到第二轮部署锚点 `19470eb2414fc2d34c641b44e6e180c12d864da4`：

```bash
rollback_dir=$(mktemp -d /tmp/status-compass-rollback.XXXXXX) && git clone --branch gh-pages --single-branch https://github.com/veryvisa/status-compass.git "$rollback_dir" && git -C "$rollback_dir" reset --hard 19470eb2414fc2d34c641b44e6e180c12d864da4 && git -C "$rollback_dir" push --force-with-lease origin HEAD:gh-pages
```

## 复盘与留痕

- 差点把同一句里的 1095 天和其他税表号判成规则冲突；机器门已改为语义范围与近邻表号，错误形态及正反样本落在 `scripts/content-gate.mjs` 与 `tests/content-gate.test.mjs`。
- 值得沿用的是“内容只有一个源、页面全由关系字段派生”；collection、导航、目录和页尾卡已经固化在 `src/content.config.ts` 与 `src/components/`，下轮不再手工同步卡片文案。
- 暴露的系统洞是原发布门只看安全和宽度，不看导航是否真的连起来；本轮已把整卡、路由数、目录、前后篇、摘要分流和首页卡数写进 `scripts/gate.mjs`。
