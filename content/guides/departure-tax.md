---
title: 离境税怎么算：视同处置、哪些资产除外、T1161/T1243/T1244 与离开后的非居民预扣
slug: departure-tax
summary: 离境当天多数投资按市值视同卖出；房产、RRSP、TFSA、RESP 除外，财产超 2.5 万须填 T1161。
updated: 2026-10-01
related_paths: [leaving-canada, renounce-pr, renounce-citizenship, senior-parent, split-family]
related_guides: [tax-residency, benefits-residence, renounce-pr, renounce-citizenship]
tools: [departure-tax, tax-residency, benefits]
forum: [58462, 52712, 58866, 58716]
forum_title: 2026 加拿大离境税详解：一个算例看懂视同处置、三张表与延付担保
site_digest: |
  离境税不是一个单独的税种。你停止做加拿大税务居民的那一天，税法把你持有的大多数财产当作按当天公允市值卖掉、再按同价买回，由此产生的资本利得按普通规则计入离境那年的收入，其中一半应税。触发点是税务居民身份结束，不是放弃 PR、入籍别国或注销医保。

  主要例外：加拿大境内的不动产、通过加拿大常设机构经营的业务财产、各类养老金与年金、RRSP、RRIF、RESP、RDSP、TFSA、加拿大境内寿险权益（分隔基金保单除外）等。离境前十年内在加拿大居住不满 60 个月的人，来加拿大时已持有的财产（或之后继承的）也除外。

  | 关键数字 | 规则 |
  |---|---|
  | 25,000 加元 | 离境时财产公允市值合计超过须填 T1161（现金、注册账户、单件不足 1 万的个人用品不计） |
  | 每天 25 加元 | T1161 逾期罚款，最低 100、最高 2,500 加元 |
  | 次年 4 月 30 日 | T1244 延付选择的截止日 |
  | 16,500 加元 | 延付的联邦税超过此数须提供担保（原魁省居民 13,777.50） |
  | 25% | 离开后股息、养老金、RRSP 提款等加拿大来源收入的一般预扣率，协定可降低 |

  最容易错的两点：把 T1161 的 2.5 万门槛当成起征点；以为房产离境时也要按市值缴一次税。房产不视同处置，但仍要列进 T1161，以后卖出时按非居民售房规则处理。

  手里有大额非注册投资、加拿大公司股份，或可能几年后回流，就该读完整详解，离境前先算账。
---

一对在多伦多住了十几年的夫妇决定回国照顾父母。他们有一套自住房、两人的 RRSP 和 TFSA、一个非注册券商账户，还有早年在国内买的 A 股。临走前邻居提醒「要交离境税」，两人第一反应是：房子是不是要先卖？其实房子恰好是不必按市值视同处置的那一类，真正要算的是那个券商账户和 A 股。

## 规则原文怎么说

### 视同处置

CRA 的原话是：当你离开加拿大时，你被视为已按公允市值卖出某些类型的财产（即使你没有卖），并立即按同一金额重新取得，这叫视同处置，可能要申报资本利得，也就是常说的离境税。[来源](https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/leaving-canada-emigrants.html) 法律依据是所得税法第 128.1(4) 条，时点是你停止成为加拿大居民的那一天。被中加协定判为中国居民、依第 250(5) 条视为非居民的人，适用同样的规则。

资本利得的一半计入应税收入，这是所得税法第 38 条的一般规则；此前提议的提高纳入率方案已经撤回，现行仍是二分之一。[来源](https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-38.html) 所以离境税没有一个固定税率，它就是离境那年你的普通所得税的一部分，按联邦和离境时所在省的税率计算。

### 哪些资产除外

CRA 列出的主要例外如下，完整清单以所得税法第 128.1(10) 条「excluded right or interest」的定义为准：[来源](https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/dispositions-property.html)

| 类别 | 例子 |
|---|---|
| 加拿大不动产 | 自住房、出租房、土地，以及加拿大资源财产、林木资源财产 |
| 加拿大业务财产 | 通过在加拿大的常设机构经营的业务财产（含存货） |
| 养老与注册计划 | 养老金计划、年金、RRSP、PRPP、RRIF、RESP、RDSP、TFSA、DPSP 等 |
| 部分信托与雇员计划 | 雇员福利计划、受加拿大税管辖的雇员股票期权、某些加拿大居民个人信托权益 |
| 加拿大境内寿险 | 加拿大寿险保单权益（分隔基金保单除外） |
| 短期居民的原有财产 | 离境前十年内在加拿大居住共 60 个月或以下者，最后一次成为居民时已持有（或其后继承）的财产 |

对加拿大不动产和业务财产，你也可以主动选择把它们纳入视同处置（例如为了用掉亏损），要附 T2061A。[来源](https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/dispositions-property.html)

### 三张表各管什么

T1243 用来计算视同处置产生的资本利得或损失，结果转到 Schedule 3。T1161 是离境财产清单：离境时你拥有的全部财产公允市值合计超过 25,000 加元就要填，列出境内外的财产，附在离境年申报表上。计算这个合计时不算现金和银行存款、各类注册计划与养老金、单件市值不足 10,000 加元的个人使用财产（家具、衣物、汽车、收藏品），以及短期居民来加时已持有且不属于应税加拿大财产的财产。[来源](https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/dispositions-property.html)

注意加拿大房产不在 T1161 的排除名单上：它不视同处置，但要列进清单。T1161 逾期每天罚 25 加元，最低 100、最高 2,500；即使你不需要报税，也必须在申报截止日前交 T1161。[来源](https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/dispositions-property.html)

T1244 用来选择延后缴纳视同处置产生的税，不论金额大小都可以选；以后实际卖出时再缴，期间不计利息。选择必须在离境次年 4 月 30 日前做出；延付的联邦税超过 16,500 加元（原魁省居民 13,777.50）须提供足够担保，省税部分也可能要担保，要在 4 月 30 日前与 CRA 谈妥。雇员福利计划的视同处置不能延付。[来源](https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/dispositions-property.html)

## 怎么算：一个示意算例和两个边界情况

### 算例：回国定居的夫妇（数字只是示意）

丈夫 2026 年 8 月 15 日离境，当天成为非居民（回到原居住国，一般以离开当天为准）。他名下的财产与离境日市值如下：

| 财产 | 成本 | 离境日市值 | 是否视同处置 |
|---|---|---|---|
| 多伦多自住房（一半产权） | 300,000 | 700,000 | 否，加拿大不动产 |
| RRSP | — | 250,000 | 否，注册计划 |
| TFSA | — | 95,000 | 否，注册计划 |
| 加拿大银行存款 | — | 40,000 | 不适用，现金 |
| 非注册券商账户：加拿大股票 | 120,000 | 300,000 | 是 |
| A 股（来加拿大后买入） | 200,000 | 260,000 | 是 |
| 美股 ETF | 80,000 | 60,000 | 是 |
| 汽车 | — | 8,000 | 个人使用财产 |

第一步，算视同处置的利得：加拿大股票 300,000－120,000＝180,000；A 股 260,000－200,000＝60,000；美股 ETF 60,000－80,000＝－20,000。净资本利得 180,000＋60,000－20,000＝220,000 加元。

第二步，应税部分为一半：220,000×1/2＝110,000 加元，计入 2026 年离境年申报表，与他 1 月到 8 月的工资等全球收入合并计税。

第三步，判断 T1161：要列入的财产包括房产 700,000 与三项投资合计 620,000，远超 25,000，必须填；RRSP、TFSA、存款和汽车不列。

第四步，决定是否延付。假设报税软件算出这 110,000 对应的联邦税约为 25,000 加元（只是示意的数），超过 16,500，选择 T1244 延付就要在 2027 年 4 月 30 日前与 CRA 谈好担保；如果联邦税只有 15,000，延付不需担保，但省税部分仍可能被要求担保。延付的税等他以后真正卖出这些股票时，在卖出次年 4 月 30 日前缴。[来源](https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/dispositions-property.html)

### 边界情况一：住满不足 60 个月的新移民

一位 2022 年 3 月登陆、2026 年 8 月离境的人，离境前十年内在加拿大居住约 53 个月，不超过 60 个月。他登陆时带来的国内股票，属于「最后一次成为居民时已持有的财产」，不视同处置，也不列入 T1161（只要不是应税加拿大财产）。但他登陆后在加拿大券商买的股票不享受这项例外，照样视同处置。差一个月就跨过 60 个月，离境日早晚对结果影响很大。

### 边界情况二：两年后又回来了

1996 年 10 月 1 日以后离境、后来重新成为加拿大税务居民的人，如果当年视同处置的财产还在手里，可以选择「撤销」（unwind）当初的视同处置，减少或消除离境年的利得与税；若当时选了延付，已提供的担保可能部分或全部退还。选择要以书面方式在你重新成为居民那年的申报截止日前提出，附上适用财产清单和各自市值。[来源](https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/dispositions-property.html)

## 离开后的非居民预扣

成为非居民后，你只就加拿大来源收入在加拿大纳税。股息、租金、养老金、OAS、CPP、RRSP 与 RRIF 提款、年金等通常由付款方预扣第 XIII 部分税，一般税率 25%，除非税收协定降低；预扣通常就是最终税负，不能靠报税退回。与你无关联的付款方支付的利息，一般免预扣。[来源](https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/non-residents-canada.html)

中加协定对几类收入设了上限（受益所有人适用）：股息一般 15%，持有付息公司至少 10% 投票权的公司股东 10%；利息 10%；特许权使用费 10%。

[来源](https://www.canada.ca/en/department-finance/programs/tax-policy/tax-treaties/country/china-agreement-1986.html) 协定没有单独的养老金条款，第 18 条只管政府服务报酬（养老金除外），养老金类收入落到第 20 条，其第 3 款允许来源国征税，所以协定本身没有为 RRSP 提款或养老金设上限。要享受协定税率，一般要向付款方交 NR301 声明表；实际预扣率以付款方的处理和 CRA 的答复为准。[来源](https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/nr301.html)

两个可以改善的选择：出租加拿大房产的，可按第 216 条就净租金另报一份申报表；领取某些加拿大养老金的，可按第 217 条选择按居民税率计税，可能退回部分预扣。[来源](https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/electing-under-section-217.html) 离境后卖出加拿大房产、加拿大业务财产或未上市加拿大公司股份，属于应税加拿大财产，要走第 116 条的通知与证书程序。[来源](https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/non-residents-canada.html)

TFSA 离境后可以保留，投资收益和提款在加拿大继续免税，但非居民期间不能再供款，额度也不增加。[来源](https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/leaving-canada-emigrants.html) 定居国是否对 TFSA 收益征税，是另一国的规则，回中国定居的要另行咨询。

## 离境前值得先想清楚的几件事

第一，离境日本身是变量。非居民身份通常从离开、家人离开、成为新居住国居民三者中最晚的一天开始，回到原居住国的一般是离开当天。[来源](https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/leaving-canada-emigrants.html) 对住了 55 个月左右的人，早走或晚走几个月，决定来加时带来的资产要不要算视同处置。

第二，亏损可以用。视同处置的亏损与利得在同一张 T1243 上相抵；你也可以选择把加拿大不动产或业务财产纳入视同处置（附 T2061A），但这只在它们本身有亏损、或有特别安排时才有意义，否则是平白多报利得。[来源](https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/dispositions-property.html)

第三，注册账户的取舍在离开之后。RRSP 不视同处置，离开后提款被预扣；离开前作为居民提款则并入当年收入按累进税率计税。哪种更省，取决于离境年其他收入的高低和以后的提款节奏，没有统一答案，值得请会计师按你的数字算一遍。

第四，中国一侧的成本。加拿大按离境日市值给你一个新的成本，中国税务机关以后怎样认这些资产的成本，是中国税法的问题；回国后卖出这些股票之前，先问清楚中国一侧的计算方法，别假设两边自动衔接。

## 办理步骤

| 时间 | 要做的事 | 表格或渠道 |
|---|---|---|
| 离境前 1–3 个月 | 逐项取得成本与离境日估值，算出 T1243 草稿，决定是否延付、是否用亏损 | 券商成本报告、估值 |
| 离境前 | 通知加拿大银行、券商和付款方你将成为非居民，提供新居住国 | 付款方表格（如 NR301） |
| 离境当天 | 保留出境证明，记下离境日 | 机票、出入境记录 |
| 离境次年 4 月 30 日前 | 提交离境年申报表，第 1 页填离境日；附 T1243、Schedule 3、T1161；要延付的附 T1244 并谈好担保 | 离境日所在省的报税包 |
| 之后每次实际卖出 | 向温尼伯税务中心非居民 T1 调整组报送卖出明细，次年 4 月 30 日前缴延付税 | 书面清单 |
| 回流那年 | 如要撤销视同处置，在当年申报截止日前书面提出 | 书面选择 |

截止日以 CRA 当年公布为准，核读于 2026 年 10 月。如不确定自己哪天成为非居民，可以递 NR73 请 CRA 给意见。[来源](https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/nr73.html)

## 被查、出错时怎么办

离境年申报被评税后不服，个人可以在申报截止日后一年内或评税通知日起 90 天内（取较晚者）用 T400A 提出异议。[来源](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/p148/p148-resolving-your-dispute-objection-appeal-rights-under-income-tax-act.html) 漏交 T1161 或漏报视同处置，自己发现的可以申请更正；涉及罚款和利息的，可以评估自愿披露计划（VDP），2025 年 10 月 1 日后的主动申请通常免全部罚款和 75% 利息。[来源](https://www.canada.ca/en/revenue-agency/programs/about-canada-revenue-agency-cra/compliance/voluntary-disclosures-program/changes-vdp.html) 被扣错第 XIII 部分税的，先联系付款方，再联系 CRA。

被 CRA 问到离境日或视同处置时，最有用的是三样东西：离境日当天的券商结单与估值，能证明你在那一天前后切断居所联系的文件（房子出售或出租合同、家人随行、新居住国的住所），以及每项资产的成本记录。估值一旦事后补做，很难说服人，离开前就把截图和结单存好。

## 最常见的误区

- 「放弃 PR 那天才算离境。」触发点是税务居民身份结束，常常早于或晚于你办移民手续的日子。
- 「T1161 超过 2.5 万才交离境税。」2.5 万只是清单门槛；视同处置有利得就要报，不论多少。
- 「房子离境时要按市值交一次税。」加拿大不动产不视同处置；它仍要列在 T1161 上，以后卖出走非居民售房程序。
- 「RRSP 离境要按余额一次性纳税。」RRSP、RRIF、TFSA、RESP 都不视同处置；离开后提 RRSP 才会被预扣。
- 「离境税是固定 25%。」25% 是非居民预扣的一般税率；离境税是普通所得税，按利得的一半计入收入。
- 「亏损的资产不用管。」视同处置的亏损可以抵同年的视同利得，算例里美股 ETF 的 2 万亏损就是这么用的。
- 「延付就是免税。」延付只是推迟，卖出时照缴；超过门槛还要先提供担保。
- 「离开后照样往 TFSA 存钱。」非居民期间不能供款，额度也不增加。
- 「离开后卖加拿大房子，等报税时再说。」非居民出售加拿大房产属于应税加拿大财产，卖出前后要走第 116 条的通知与证书程序。
- 「回来了税就自动退。」要在回流那年主动书面选择撤销，过期不候。

## 要准备的文件清单

- 每项非注册投资的买入记录与调整后成本基础（ACB）。
- 离境日估值：券商当日结单或截图，非上市股份的估值报告。
- 加拿大房产的买入合同和改良开支记录（T1161 列示、日后出售用）。
- 来加拿大时已持有财产的清单与入境日市值（短期居民例外与日后计算成本都要用）。
- 在加拿大居住月份的计算底稿（判断是否满 60 个月）。
- 离境证明与新居住国的居住证明（租约、户籍恢复、工作合同）。
- 发给各付款方的非居民通知副本。
- 延付担保的往来函件。

## 什么情况找持牌专业人士

持有私人公司股份、大量非注册投资、雇员股票期权或信托权益的，应在离境前请加拿大税务会计师或税务律师做离境税测算和延付担保方案。可能在几年内回流、想保留撤销选择的，事先把估值和文件做全。夫妻一方先走、一方留下处理房产的，先走那位成为非居民的日子，按 CRA 的规则可能要等到配偶离开那天（回到原居住国的除外），要先把日子算清。在中国一侧如何确认这些资产的成本、回国后境外所得如何申报，要另找中国注册税务师。

## 相关处境与工具

- 处境：[准备离开加拿大](/paths/leaving-canada/)、[放弃 PR](/paths/renounce-pr/)、[放弃加拿大国籍](/paths/renounce-citizenship/)、[父母养老怎么安排](/paths/senior-parent/)。
- 专题：[税务居民怎么判](/guides/tax-residency/)、[离开加拿大后的福利与医保](/guides/benefits-residence/)。
- 工具：[离境税估算](/tools/departure-tax/)、[税务居民自查](/tools/tax-residency/)。
- 延伸阅读：[离境税讨论](https://bbs.fcgvisa.com/t/58462)、[RRSP/TFSA 离境怎么办](https://bbs.fcgvisa.com/t/52712)。

## 官方来源

- [CRA：Leaving Canada (emigrants)](https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/leaving-canada-emigrants.html)
- [CRA：Dispositions of property for emigrants of Canada](https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/dispositions-property.html)
- [CRA：Non-residents of Canada](https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/non-residents-canada.html)
- [CRA：Electing under section 217](https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/individuals-leaving-entering-canada-non-residents/electing-under-section-217.html)
- [CRA：NR73](https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/nr73.html)
- [CRA：P148 异议权利](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/p148/p148-resolving-your-dispute-objection-appeal-rights-under-income-tax-act.html)
- [CRA：Changes to the Voluntary Disclosures Program](https://www.canada.ca/en/revenue-agency/programs/about-canada-revenue-agency-cra/compliance/voluntary-disclosures-program/changes-vdp.html)
- [Income Tax Act 第 38 条](https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-38.html)
- [Income Tax Act 第 128.1 条](https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-128.1.html)
- [加拿大财政部：中加税收协定（1986）](https://www.canada.ca/en/department-finance/programs/tax-policy/tax-treaties/country/china-agreement-1986.html)
