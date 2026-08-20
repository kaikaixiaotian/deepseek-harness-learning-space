# Document Templates

Every file the learning-loop system writes follows one of these templates. Keep them consistent so the user (and future subagents) can always find the same sections in the same place.

## FORMAT NOTE — user-facing files are HTML (read `references/html-format.md` first)

All **user-facing** artifacts are now standalone **HTML** files, not markdown:
- **Chapter doc** → `chapters/stageN-chXX-<slug>.html` (read-mode)
- **Master plan** → `plan/master-plan.html` (read-mode)
- **Baseline, chapter-quiz, stage-total-quiz** → `.html` quiz-forms (radio/checkbox/textarea + submit button → answers.json)

The two authoritative HTML skeletons are at the **end of this file** (sections "read-mode html skeleton" and "quiz-form html skeleton"). Generate from those.

The markdown templates below (baseline-assessment.md, chapter doc, chapter-quiz, stage-total-quiz) are the **degradation fallback** — use them ONLY when an HTML file repeatedly fails JS verification (see `references/html-format.md` graceful degradation). They also document the *content structure* (sections, six-element concepts, KP list, question types) that the HTML skeletons must preserve — so read them for "what content goes where", then render that content into the HTML skeleton.

**Unchanged (stay markdown — internal AI use, not user-facing):** per-chapter material card (`plan/sources/*.md`), plan-quiz receipt (`stageN-chXX-plan-quiz.md`), wiki files, meta.json.

## baseline-assessment.md

Located at `quizzes/baseline.html` (zh: `测验/基线测评.html` — unified storage in the quizzes dir; no separate baseline dir) — the degradation fallback of the quiz-form baseline; the user fills this in and submits per the answers protocol.

```markdown
# 基础测评 — <topic>

> 说明：本测评用于定位你当前的起点，**不影响通过与否**。请尽力作答；完全不会的题写「不知道」即可。所有题型都将贯穿你后续的学习，请熟悉它们的格式。

## 个人背景
- 你之前接触过 <topic> 吗？到什么程度？（自学/课程/工作/完全没有）
- 你学这个的目标是什么？（如：能解决实际问题 / 通过面试 / 能教别人）
- 每周可投入学习时间？

## 一、选择题（选择 / 多选）
1. (单选) ……？
   - A. …
   - B. …
   - C. …
   - D. …
   - **你的答案：**

## 二、填空题
1. ……中的关键概念是 _____。
   - **你的答案：**

## 三、实战题
1. （给定具体任务/数据/代码场景）请写出你的解决步骤或代码。
   - **你的答案：**

## 四、模拟题
1. （场景角色扮演，如「假设你是 X，面对 Y 情况，你会如何处理？」）
   - **你的答案：**

## 五、算法 / 推导题
1. （推导一个结论 / 设计一个流程 / 写出算法步骤）
   - **你的答案：**

## 六、高难度综合题
1. （跨章节综合、开放性、需要多步推理）
   - **你的答案：**
```

Baseline should have ~15–25 questions total, spread so easy and hard both appear. The goal is to locate the user's level, not to grade harshly.

## master-plan.html (总目录)

Located at `plan/master-plan.html` (中文: `计划/总目录.html`). The roadmap for the whole topic. **Now grounded in an external canonical learning path** (pulled by the curriculum-research subagent), then adapted to the user's baseline — NOT invented from AI memory. See `references/curriculum-research.md`.

```markdown
# 学习计划总目录 — <topic>

- **目标水平**：<target level>
- **基线测评得分**：<score> / 1.0
- **基线画像**：<one-paragraph strengths & gaps>
- **规划依据**：<which external canonical path this follows, e.g. "基于 react.dev/learn 官方学习路径 + roadmap.sh/frontend">
- **数据增强状态**：✅ 已基于外部路径 / ⚠️ 降级（网络不可达，纯 AI 推断，结构与公认曲线可能不符）
- **生成时间**：<ts>

## 规划来源（外部学习路径）
- [1] <url> — <来源类型：官方学习路径/路线图/书目录> · 提供了<主骨架/补充>
- [2] <url> — …

## 适配说明（AI 对外部骨架做的调整 + 理由）
- 拆分/合并：将官方第 X 章拆为两章，因为<基线/目标水平理由>
- 补强：新增「<章节>」章（标记 补强，不在原始路径），因为基线显示用户缺<前置知识>
- 跳过：target_level=aware，跳过最深章节「<章节>」
- 顺序：保持官方顺序（或：调整 X 至 Y 前，因为<前置逻辑>）
（无偏离时写：完全遵循外部路径，未做结构性调整）

## 阶段 1 — <stage name>  [出处: <url>]
- **目标**：<stage objective>
- **章节**：
  1. `<slug>` — <one-line objective>（题型侧重：<types>） [出处: <url> 或 AI推断]
  2. …
- **资料卡**：见 `plan/sources/stage1-chXX.md`
- **阶段测验**：覆盖以上全部章节的综合测验

## 阶段 2 — <stage name>  [出处: <url>]
…

## 进度总览
| 阶段 | 章节 | 状态 | 章节测验 | 计划测验 | 文档版本 |
|------|------|------|----------|----------|----------|
| 1 | 1 | ⏳进行中 | — | — | v1 |
```

## per-chapter material card — `plan/sources/stageN-chXX.md`

Written by the curriculum-research subagent during initialization (one per chapter). NOT teaching prose — a reference summary the chapter-generation subagent Reads to ground its content. See `references/curriculum-research.md`.

```markdown
# 章节资料卡 — 阶段< N >·章节< XX > <title>

> 来源：<url> (<type>) · 抓取于 <date>
> 本卡供章节生成子 agent 参考，不是教学正文。

## 该主题的官方要点
- <key point 1, from source>
- <key point 2>
- …

## 官方强调的易错点
- …

## 建议的教学顺序（来自官方教程）
- 先讲 X，再讲 Y，因为 …

## 引用
- <url>
```

## chapter doc — `chapters/stageN-chXX-<slug>.md`

The actual teaching material. Rebuilt versions get `_v2`, `_v3`.

```markdown
# 阶段< N > · 章节< XX > — <title>

> 版本 v< version > · 前置：<prev chapter or none> · 预计学习时间：<X>min
> 本章节目标：学完后你应当能 <1–3 条可验证的能力>
> 学习路线：通读 → 每个概念：操作②的交互动画 + 做检查点 → 答错的回看对应要素 → 全部检查点通过后再打开测验

## 引入
（一个真实问题或反直觉现象，2–4 句话勾起为什么需要学这个。用可观察的行为/输出反差开场，**不要用类比开场**。）

## 知识点清单（本章覆盖度基准 + 考点断言）
> 本节是**章节测验出题范围的唯一基准**。每个 KP 下必须列出 3–6 条**可考断言**（A1、A2…）——断言 = 一句可判对错的事实。测验每题的考点必须映射到具体断言；⑤边界条件的每个 case 必须有对应断言；映射不到断言的题按超纲处理（见 `references/grading.md`）。生成测验前先核对这份清单，生成后再次核对断言级覆盖。
- **KP1**：<一句话知识点>（关联概念节：§核心概念.1）
  - A1 <断言，如「`b = a` 复制的是引用值，堆上不出现新对象」>
  - A2 <断言>
  - A3 <…>
- **KP2**：<一句话知识点>（关联：§核心概念.2）
  - A1 <…>
（建议 4–8 个知识点；断言粒度以"能出一道独立小题"为准。）

## 核心概念
### 1. <concept>（KPx）
**① 精确定义**（技术层面：公式 / 函数签名 / 语法 / 语义规则，必须可查证。**排版规则**：每条独立规则单独一条列表项、每条 ≤2 句；≥2 个并列情形（如基本类型 vs 引用类型）必须分条列出并加粗情形名。禁止类比。）
**② 直观演示（交互动画）**（该 KP 的**机制本身**的交互动画，内嵌在正文（HTML 版为 iframe）。配 2–3 条「观察要点」：点什么、看哪个状态变化、验证哪条断言（KP-Ax）。演示必须能复现⑤中至少一个边界 case。仅纯记忆型 KP 可豁免，豁免须在生成记录中写明理由。**禁止用类比文案替代演示**。规范见 `references/visualization.md`。）
**③ 最小例子**（能跑/能验证的最小用例，≤10 行，标注输入输出）
**④ 推导或代码**（机制如何落地：编号步骤逐步推导（每步一句），或代码逐行注释。不能只给结论。）
**⑤ 边界条件**（**排版规则**：每条 case 单独一条列表项，格式 = 场景（代码/输入）→ 结果 → 一句原因；禁止内联 a)b)c)。每条 case 必须有断言清单中的对应断言，其中至少一条要在②演示中可复现。）
**⑥ 与相关概念对比**（和易混淆的 X 的区别：≥2 概念 × ≥2 维度必须用对比表格；何时该用本概念而非 X？）

**🧪 检查点（非计分自测，做完再往下）**
- Q1（预测）：<一段代码/场景——先写下预测，再到②演示里操作验证> → 答案 + 一句推理 + 回看指引（如「见⑤-b」）
- Q2（判断+说理由）：<一个说法，判断对错并说明机制> → 同上
- Q3（填关键值）：<挖一个精确值/签名/默认值> → 同上

### 2. <concept>
（同样结构。①③④⑤⑥齐全 + ②演示（或注明豁免理由）+ 检查点 2–3 题——全部非妥协项，缺一即重生成。）

## 实战演示
（端到端走一个例子，展示核心概念如何协同落地。如果章节偏算法，这里给出完整推导/代码；如果偏实操，给出可复现的命令序列 + 预期输出。这一节要能让用户照着做一遍。）

## 常见陷阱 & 易错点
- …（每条对应一个 KP 或断言，标注关联）
- …

## 小结 & 自查
- 三个关键 takeaway（对应最重要的 3 个 KP）
- 自查：逐条对照断言清单——哪条断言你无法独立复述或演示？回看对应概念节、重玩②演示、重做错过的检查点。

## 下一步
学完填写 `quizzes/stageN-chXX-quiz.html` 并提交。
```

**六要素是非妥协项，且类比已废除**：每个核心概念必须六项齐全 + 检查点 2–3 题。②直觉解释（类比/心智模型）**已移除**——类比（"像遥控器/像仓库/像饼干模具"）对用户不可见、不可操作，是理解偏差的主要来源；直觉改由②直观演示（可操作的交互动画）+ 观察要点承担，全文禁止比喻类文案。另一个常犯偏差是"定义密集堆砌"——①⑤的分条排版规则是硬约束（一论断一条、一 case 一条），交付前有对应的静态检查。演示默认每个核心概念必配（豁免仅限纯记忆型 KP 且须写明理由），质量标准见 `references/visualization.md`。

Calibration rule: if `baseline_score` is low, this doc leans harder on ②的观察要点 + ③例子，把④的步骤拆得更细，jargon 首次出现必给定义；但 ①精确定义 和 ⑤边界条件 仍然不可省略——只是用更通俗的话重述，不能跳过。If high, it can be denser and assume prior vocabulary.

## chapter-quiz.md — `quizzes/stageN-chXX-quiz.md`

```markdown
# 章节测验 — 阶段< N >·章节< XX > <title>

> 通过线：与计划测验合并 ≥80%。填写后上传本文件。
> 覆盖六大题型，请逐题作答。
> 每题标注「考点: KP-x·Ay」——对应章节文档「知识点清单」下的**断言**（Ax）。出题前 AI 已核对所有考点都映射到已讲授的断言；若你发现某题考点映射不到断言，按超纲规则不计分（见批阅区说明）。

## 一、选择题
1. (选择题, 1分) [考点: KP-2·A3] …
   - A. … / B. … / C. … / D. …
   - **你的答案：**
   - **理由：**（简述）

## 二、填空题
1. (填空题, 1分) [考点: KP-1·A2] … _____ …
   - **你的答案：**

## 三、实战题
1. (实战题, 4分) [考点: KP-3·A1] （明确任务 + 输入 + 期望输出格式）
   - **你的答案：**

## 四、模拟题
1. (模拟题, 4分) [考点: KP-4·A2] （场景：…… 你会如何 ……）
   - **你的答案：**

## 五、算法 / 推导题
1. (算法题, 5分) [考点: KP-2·A4] （请推导/设计 ……）
   - **你的答案：**

## 六、高难度综合题
1. (综合题, 6分) [考点: KP-1·A2, KP-3·A1] （综合 …… 与 …… 解决 ……）
   - **你的答案：**

---
*AI 批阅区（用户请勿填写）*
| 题号 | 类型 | 考点 | 正确？ | 计分？ | 失分点 |
|------|------|------|--------|--------|--------|
| 1 | 选择 | KP-2·A3 |  | 是 |  |
| 2 | 填空 | KP-1·A2 |  | 是 |  |
| 3 | 实战 | KP-3·A1 |  | 是 |  |
| … | | | | |  |
（"计分？"列：是=正常计分；**超纲=不计分**——考点映射不到章节断言清单时填此项，该题从分母中剔除，见 grading.md）
**章节测验得分：0.XX（X/Y 分，Y=计分题总分）**（若含超纲题，注明：已剔除 N 道超纲题，另见补讲补考说明）
```

## plan-quiz.md — `quizzes/stageN-chXX-plan-quiz.md`

The plan-quiz is the **transfer check**: it asks questions *deliberately different* from the chapter quiz (new scenarios, edge cases, cross-links) to verify the user can actually *use* what was taught, not just recall it.

**Format**: still live one-at-a-time in chat — the user answers in conversation, NOT by filling a file first. The back-and-forth experience is preserved (asking all questions upfront would defeat the transfer check). But after grading, you **must write the whole round back** to `quizzes/stageN-chXX-plan-quiz.md` so the user has a durable record alongside their chapter quiz.

The file is AI-authored post-hoc (after the live round finishes), not handed to the user to fill. Structure:

```markdown
# 计划测验（迁移检查）— 阶段< N >·章节< XX > <title>

> 本测验在章节测验之后进行，题目与章节测验**完全不同**（新场景/边界/跨概念）。
> 现场逐题问答，本文件为问答结束后 AI 整理写回的记录。

## 现场问答记录
### Q1 (实战题, 4分)
**题目：** <paste the question you asked live>
**你的回答：** <paste the user's answer verbatim>
**AI 讲评：** <one-line verdict + the correct reasoning if they missed>

### Q2 (模拟题, 4分)
…

---
*AI 批阅区*
| 题号 | 类型 | 正确？ | 失分点 |
|------|------|--------|--------|
| Q1 | 实战 | △ | 正确性✓ 过程✗(漏 X) 边界✗ |
| Q2 | 模拟 | ✗ | 判断✗(选了不可辩护的方案) 取舍✗ 论证✗ |
…
**计划测验得分：0.XX（X/Y 分）** · **合并分：0.45×章节 + 0.55×本测验 = 0.XX · 判定：通过 / 未通过**
```

The live round is the experience; this file is the receipt. Both matter — chat scrolls away, the file is what the user reviews when prepping for the stage-total quiz. Also append a `plan_quiz` event (score + dimension breakdowns) to `meta.json` history.

## stage-total-quiz.md — `quizzes/stageN-total-quiz.md`

Comprehensive quiz covering **every chapter** in the stage. Generated when the stage's last chapter passes (not at stage start). **Volume is the point here** — unlike the small chapter quizzes, the stage-total must be substantial because it gates stage advancement. **Must be web-research-augmented** (see `references/web-research.md`): the stage-total planner dispatches a web-research subagent first, then composes the quiz from the returned brief.

**Volume rule** (the user's explicit requirement):
- **Minimum: 2–3 questions per chapter** in the stage, spread across the six types. A 4-chapter stage → ≥12 questions; a 6-chapter stage → ≥15.
- **Each of the six types must have ≥2 questions** (not just ≥1 like chapter quizzes).
- **≥2 综合** that each span ≥2 chapters.
- Questions should lean into the stage's cumulative weak spots recorded in chapter wikis.

```markdown
# 阶段总测验 — 阶段< N > <stage name>

> 覆盖本阶段全部 <M> 个章节。通过线 ≥80%。填写后上传本文件。
> 六大题型齐全且每类 ≥2 题；本测验经网络权威源数据增强，每题标注出处。

> [数据增强状态]  ← 由 web-research 子agent 的结果决定，三选一：
>   ✅ 已增强：全部题目附 [出处: url]
>   ⚠️ 部分增强：标注的题目已验证，[未验证] 的题目需核对官方文档
>   ⚠️ 降级：网络不可达，本测验未经外部验证，事实准确性可能偏低

## 一、选择题（≥2 题）
1. (选择题, 1分) …… [出处: <url>]
   - A. … / B. … / C. … / D. …
   - **你的答案：**
   - **理由：**
2. (选择题, 1分) …… [出处: <url>]
   - **你的答案：**

## 二、填空题（≥2 题）
1. (填空题, 2分) …… [出处: <url>]
   - **你的答案：**
2. (填空题, 2分) …… [未验证]   ← 仅在降级路径出现
   - **你的答案：**

## 三、实战题（≥2 题，基于真实场景/真实 API/真实数据集）
1. (实战题, 5分) ……（综合多个章节的实操任务） [出处: <url>]
   - **你的答案：**
2. (实战题, 5分) …… [出处: <url>]
   - **你的答案：**

## 四、模拟题（≥2 题，跨章节场景）
1. (模拟题, 5分) …… [出处: <url>]
   - **你的答案：**
2. (模拟题, 5分) …… [出处: <url>]
   - **你的答案：**

## 五、算法 / 推导题（≥2 题）
1. (算法题, 6分) …… [出处: <url>]
   - **你的答案：**
2. (算法题, 6分) …… [出处: <url>]
   - **你的答案：**

## 六、高难度综合题（≥2 题，每题跨 ≥2 章节）
1. (综合题, 8分) ……（必须跨 ≥2 个章节综合） [出处: <url>, <url2>]
   - **你的答案：**
2. (综合题, 8分) …… [出处: <url>]
   - **你的答案：**

---
## 引用源（用户可点击核对）
- [1] <url> — <一句话说明此处用于哪题/什么事实>
- [2] <url> — …
（每个用到的 url 都列在此处，便于复查）

---
*AI 批阅区（用户请勿填写）*
| 题号 | 类型 | 正确？ | 出处/验证状态 | 失分点 |
|------|------|--------|--------------|--------|
| 1 | 选择 |  | [出处: url] |  |
| 2 | 填空 |  | [未验证] |  |
| 3 | 实战 |  | [出处: url] |  |
…
**阶段总测验得分：0.XX（X/Y 分）** · **判定：通过 / 未通过**
```

Passing = ≥0.80. On fail, identify the weakest chapter from the 失分点 rows and loop the rebuild flow for that chapter; after it re-passes, issue `stageN-total-quiz_v2.md` (re-research if the failure was on a [出处]-tagged factual question — the source may have been misread).

---

## chapter-quiz.md (filled example slice)

For reference, here's what a graded chapter quiz's AI section looks like. Subjective rows carry per-dimension breakdowns so the user sees *why* they lost points:

```markdown
---
*AI 批阅区*
| 题号 | 类型 | 正确？ | 失分点 |
|------|------|--------|--------|
| 1 | 选择 | ✓ | — |
| 2 | 填空 | ✗ | 混淆了 A 与 B 的定义 |
| 3 | 实战 | △ | 正确性✓ 过程✗(用了 X 而非 Y) 边界✗(漏判空输入) |
| 4 | 模拟 | △ | 判断✓ 取舍✗(没提 trade-off) 论证✗(结论对但理由空) |
| 5 | 综合 | △ | 子问题(a)✓ (b)△(方向对细节错) (c)✗ |
…
**章节测验得分：0.70**（未达单测线，但以合并分判定）
```

The 失分点 column is the part the user actually reviews against. Keep it specific and conceptual — "混淆 A/B" beats "wrong"; "正确性✓ 过程✗" beats "partial".

---

## visualization html skeleton — `chapters/viz/stageN-chXX-<kp-slug>.html`

Standalone, double-click-to-open, vanilla JS, no external deps. Follow this skeleton; the body/interaction adapts to the concept. Full rules in `references/visualization.md`.

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title><KP 概念名> — 交互演示</title>
<!-- learning-loop skeleton: viz -->
<style>
  /* ===== dsh design system (same token layer as the chapter/quiz skeletons) =====
     This demo is embedded in the chapter page as an iframe: the learning
     space injects the host theme (ll-dark/ll-light/ll-glass + resolved
     --dsw-alias-* tokens) when inlining it, and the chapter page forwards
     live ll-theme pushes — so the demo follows the dsh host theme (incl.
     theme plugins) for free. Standalone (file://) dark follows the OS via
     the media query with the dsh dark statics. NEVER define --dsw-* /
     --dsh-* variables here — consume with fallbacks only (contamination
     guard; mind the spaces around any slash-star inside comments). */
  :root{
    --bg:var(--dsw-alias-bg-base,#ffffff); --surface:var(--dsw-alias-bg-layer-1,#ffffff);
    --text:var(--dsw-alias-label-primary,rgb(15,17,21)); --muted:var(--dsw-alias-label-secondary,rgb(97,102,107));
    --accent:var(--dsw-alias-state-business-primary,rgb(65,118,230)); --accent-soft:var(--dsw-alias-state-business-tertiary,rgb(228,237,253));
    --border:var(--dsw-alias-border-l1,rgba(0,0,0,0.04)); --hairline:var(--dsw-alias-border-l2,rgba(0,0,0,0.1));
    --ok:var(--dsw-alias-state-success-primary,rgb(34,197,94)); --ok-soft:var(--dsw-alias-state-success-tertiary,rgb(230,250,237));
    --err:var(--dsw-alias-state-error-primary,rgb(236,19,19)); --err-soft:rgba(254,242,242,0.9);
    --r:14px;
    --font-sans:var(--dsw-font-family,-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif);
  }
  @media (prefers-color-scheme:dark){html:not(.ll-light){
    color-scheme:dark;
    --bg:rgb(21,21,23); --surface:rgb(35,35,36);
    --text:rgb(249,250,251); --muted:rgb(207,211,214);
    --accent:rgb(103,158,254); --accent-soft:rgb(52,65,91);
    --border:rgba(255,255,255,0.06); --hairline:rgba(255,255,255,0.12);
    --ok:rgb(34,197,94); --ok-soft:rgb(35,60,44);
    --err:rgb(242,90,90); --err-soft:rgba(87,12,12,0.5);
  }}
  /* in-space dark: token-consuming restatement with dark static fallbacks —
     a snapshot gap lands on the dark statics, never a white canvas. */
  html.ll-dark{
    color-scheme:dark;
    --bg:var(--dsw-alias-bg-base,rgb(21,21,23)); --surface:var(--dsw-alias-bg-layer-1,rgb(35,35,36));
    --text:var(--dsw-alias-label-primary,rgb(249,250,251)); --muted:var(--dsw-alias-label-secondary,rgb(207,211,214));
    --accent:var(--dsw-alias-state-business-primary,rgb(103,158,254)); --accent-soft:var(--dsw-alias-state-business-tertiary,rgb(52,65,91));
    --border:var(--dsw-alias-border-l1,rgba(255,255,255,0.06)); --hairline:var(--dsw-alias-border-l2,rgba(255,255,255,0.12));
    --ok:var(--dsw-alias-state-success-primary,rgb(34,197,94)); --ok-soft:var(--dsw-alias-state-success-tertiary,rgb(35,60,44));
    --err:var(--dsw-alias-state-error-primary,rgb(242,90,90)); --err-soft:rgba(87,12,12,0.5);
  }
  /* glass skin (host marks <html> with ll-glass): transparent canvas over
     the chapter's figure card, the stage a frost-scaled overlay */
  html.ll-glass{
    --bg:transparent;
    --ll-frost:var(--dsh-aqua-frost, 1);
    --surface:color-mix(in srgb, var(--dsw-alias-bg-layer-1,#ffffff) calc(30% * var(--ll-frost)), transparent);
    --accent-soft:color-mix(in srgb, var(--dsw-alias-state-business-tertiary,rgb(228,237,253)) calc(55% * var(--ll-frost)), transparent);
  }
  *{box-sizing:border-box;}
  /* margin as PADDING: body.scrollHeight then includes the spacing, so the
     auto-height report measures the full content (a margin would be missed
     and the frame would clip 48px) */
  body { font-family:var(--font-sans); max-width: 760px; margin: 0 auto; padding: 24px 16px; color:var(--text); background:var(--bg); }
  h1 { font-size: 1.3rem; }
  .stage { /* 主可视化区域 */ min-height: 240px; border: 1px solid var(--hairline); border-radius: var(--r); padding: 16px; margin: 12px 0; background: var(--surface); }
  .controls { margin: 12px 0; }
  .controls button { padding: 6px 14px; margin-right: 8px; border: none; border-radius: 999px; background: var(--accent-soft); color: var(--accent); cursor: pointer; font: inherit; }
  .controls button:hover { box-shadow: inset 0 0 0 1px var(--accent); }
  .controls input[type="range"] { accent-color: var(--accent); }
  .legend { font-size: 0.85rem; color: var(--muted); margin-top: 8px; }
  /* 状态用颜色区分：新鲜/过期等 */
  .fresh { background: var(--ok-soft); } .stale { background: var(--err-soft); }
</style>
</head>
<body>
<h1><KP 概念名> — 交互演示</h1>
<p class="legend"><一句话说明：这个演示让你看到什么、做什么操作></p>

<div class="stage" id="stage">
  <!-- 可视化主体：div/svg/canvas，按概念选择 -->
</div>

<div class="controls">
  <!-- 至少一种交互：button（step/play/reset）、slider（参数）、或 click 高亮 -->
  <button id="btn-next">下一步 ▶</button>
  <button id="btn-reset">重置 ↺</button>
  <label>max-age: <input type="range" id="param" min="0" max="100" value="60"></label>
</div>

<div class="legend" id="status">当前状态：<动态更新这里></div>

<script>
(function(){
  'use strict';
  // —— 状态 ——
  let state = { step: 0, param: 60 };
  const stage = document.getElementById('stage');
  const statusEl = document.getElementById('status');

  // —— 渲染函数：根据 state 重绘 stage + 更新 status ——
  function render() {
    // TODO: 按 state 把可视化画进 stage
    // TODO: 根据 state 更新 statusEl.textContent
    statusEl.textContent = '当前状态：第 ' + state.step + ' 步';
  }

  // —— 交互绑定 ——
  document.getElementById('btn-next').addEventListener('click', function(){
    state.step += 1;
    render();
  });
  document.getElementById('btn-reset').addEventListener('click', function(){
    state.step = 0;
    render();
  });
  document.getElementById('param').addEventListener('input', function(e){
    state.param = parseInt(e.target.value, 10);
    render();
  });

  // —— 初始渲染 ——
  render();

  // —— 自适应高度：把本演示的实际高度 postMessage 给父页（章节页据此调整 iframe 高度，file:// 下也生效）——
  /* report BODY scrollHeight, not documentElement's: the latter is floored
     by the iframe's own viewport, so once the frame grows the report can
     never shrink below it (frames ratchet upward and never come back) */
  function reportHeight(){ try { parent.postMessage({ __vizHeight: Math.ceil(document.body.scrollHeight) }, '*'); } catch (e) {} }
  reportHeight();
  setTimeout(reportHeight, 150); setTimeout(reportHeight, 600);
  window.addEventListener('load', reportHeight);
  window.addEventListener('resize', reportHeight);
  if (window.MutationObserver) { new MutationObserver(reportHeight).observe(document.body, { childList: true, subtree: true, attributes: true }); }
})();
</script>
<script>
/* Live theme channel (learning space): the host pushes palette updates so
   theme switches and glass-knob drags re-skin this page in place instead of
   reloading it. Standalone (file://) never receives a message. Keep verbatim. */
(function () {
  function llApplyTheme(t) {
    var el = document.getElementById('ll-theme');
    if (!el) { el = document.createElement('style'); el.id = 'll-theme'; document.head.appendChild(el); }
    el.textContent = ':root{' + t.css + '}html.' + (t.dark ? 'll-dark{color-scheme:dark}' : 'll-light{color-scheme:light}');
    var cl = document.documentElement.classList;
    cl.toggle('ll-dark', !!t.dark); cl.toggle('ll-light', !t.dark); cl.toggle('ll-glass', !!t.glass);
  }
  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (!d || d.type !== 'll-theme' || typeof d.css !== 'string') return;
    llApplyTheme(d);
    var frames = document.querySelectorAll('iframe');
    for (var i = 0; i < frames.length; i++) { try { frames[i].contentWindow.postMessage(d, '*'); } catch (e) {} }
    try { if (ev.source) ev.source.postMessage({ type: 'll-theme-ack', nonce: d.nonce }, '*'); } catch (e) {}
  });
})();
</script>
</body>
</html>
```

**Skeleton non-negotiables** (mirror `visualization.md`):
- All CSS/JS inline; no `<script src>`, no `<link>` to CDN.
- **Style-token discipline (same as read-mode/quiz-form):** copy the skeleton `<style>` verbatim — the demo consumes `--dsw-alias-*` tokens with the dsh static palette as fallback, so it follows the host theme (dark + theme plugins + glass) when embedded and the OS scheme standalone. A demo generated with hardcoded light colors renders as a WHITE BOX inside a dark chapter doc. Every generated demo MUST carry the `<!-- learning-loop skeleton: viz -->` signature in its `<head>`.
- `'use strict'` and an IIFE wrapping the script (no globals leaking).
- At least one bound interaction (button/slider/click) that visibly changes the stage.
- A reset control.
- Chinese labels matching chapter terminology.
- The `render()` pattern: one function that reads `state` and repaints everything; interactions only mutate `state` then call `render()`. This avoids partial-update bugs.
- **Auto-height (keep the snippet):** the skeleton's `reportHeight()` posts `document.body.scrollHeight` to the parent on load / resize / DOM-change; the chapter page resizes the iframe to fit. NEVER report `documentElement.scrollHeight` — it is floored by the iframe's own viewport, so a grown frame can never shrink back. Never delete the reporter or hard-set a tiny iframe height — clipped controls are the #1 demo usability bug.
- **Live theme channel (keep the snippet):** the `llApplyTheme` listener at the end of `<body>` re-skins the demo in place when the host pushes `{type:'ll-theme',...}` — the chapter page forwards these pushes into embedded demo iframes. Standalone (file://) never receives a message.

---

## read-mode html skeleton — `chapters/stageN-chXX-<slug>.html` / `plan/master-plan.html`

Standalone, double-click-to-open, vanilla, no deps. For chapter docs and master plan (user reads only, no form). Content structure mirrors the md chapter-doc template (引入 / 知识点清单+考点断言 / 核心概念六要素——②为内嵌演示 / 每概念检查点 / 实战 / 陷阱 / 小结) — render that content into HTML. Full rules in `references/html-format.md`.

> **⚠️ Provenance rule (load-bearing):** copy this skeleton + `<style>` **fresh from this file** on EVERY generation and EVERY rebuild. NEVER copy the structure/style from an existing sibling `chapters/*.html` — siblings are generated output that may come from an older skill version and will silently propagate a stale skeleton. Every generated chapter MUST carry the `<!-- learning-loop skeleton: read-mode -->` signature in its `<head>`; the main agent greps for it before shipping and regenerates if it's missing.

```html
<!DOCTYPE html>
<!-- set <html lang> per the workspace locale: zh workspaces lang="zh-CN", en workspaces lang="en" -->
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>阶段< N > · 章节< XX > — <title></title>
<!-- learning-loop skeleton: read-mode -->
<style>
  /* ===== dsh design system (same vars as quiz-form) =====
     Base colors CONSUME the dsh design tokens (--dsw-alias-*) with the dsh
     STATIC palette as fallback (not a third-party palette): opened in a
     browser the fallbacks apply (dark via prefers-color-scheme), opened
     inside the learning space the injected ll-theme tokens win and the page
     follows the dsh host theme — including token-overriding theme plugins
     (e.g. ui-aqua: the bridge snapshots the OVERRIDDEN values, so the deep-sea
     palette arrives for free). The accent is the dsh business blue family
     (state-business-*): --dsw-alias-brand-primary is monochrome black in dsh
     light mode and must NOT drive selection/accent UI here. NEVER define
     --dsw-* / --dsh-* variables here — consume with fallbacks only
     (contamination guard; the spaces around the slash matter: a bare
     star-slash sequence CLOSES this comment early and the parser then
     swallows the whole :root block as a bad selector). */
  :root{
    --bg:var(--dsw-alias-bg-base,#ffffff); --surface:var(--dsw-alias-bg-layer-1,#ffffff); --surface-2:var(--dsw-alias-bg-layer-2,#ffffff); --skeleton:var(--dsw-alias-bg-skeleton,rgba(0,0,0,0.04));
    --text:var(--dsw-alias-label-primary,rgb(15,17,21)); --muted:var(--dsw-alias-label-secondary,rgb(97,102,107)); --faint:var(--dsw-alias-label-tertiary,rgb(129,133,140));
    --accent:var(--dsw-alias-state-business-primary,rgb(65,118,230)); --accent-soft:var(--dsw-alias-state-business-tertiary,rgb(228,237,253)); --accent-border:var(--dsw-alias-border-l3,rgba(0,0,0,0.12));
    --hover:var(--dsw-alias-interactive-bg-hover,rgba(38,49,72,0.06));
    --border:var(--dsw-alias-border-l1,rgba(0,0,0,0.04)); --hairline:var(--dsw-alias-border-l2,rgba(0,0,0,0.1));
    --obj-bg:var(--dsw-alias-state-business-tertiary,rgb(228,237,253));  --obj-bd:var(--dsw-alias-state-business-primary,rgb(65,118,230));
    --kp-bg:var(--dsw-alias-state-warn-tertiary,rgb(254,245,231));  --kp-bd:var(--dsw-alias-state-warn-primary,rgb(245,158,11));  --kp-text:var(--dsw-alias-state-warn-label,rgb(221,134,41));
    --ok:var(--dsw-alias-state-success-primary,rgb(34,197,94)); --err:var(--dsw-alias-state-error-primary,rgb(236,19,19)); --warn:var(--dsw-alias-state-warn-primary,rgb(245,158,11));
    --code-bg:var(--dsw-alias-markdown-code-block,rgb(249,250,251)); --inline-code:var(--dsw-alias-markdown-inline-code,rgb(235,238,242));
    /* corner language (dsh): surface 14 / control 10 / atom 8 */
    --r-atom:8px; --r-ctrl:10px; --r-surface:14px; --r-sm:var(--r-atom); --r:var(--r-surface); --r-lg:var(--r-surface);
    --ease:var(--ds-ease-in-out,cubic-bezier(0.4,0,0.2,1));
    --shadow-sm:var(--dsw-shadow-lv1,0 2px 4px 0 rgba(0,0,0,0.05)); --shadow:var(--dsw-shadow-lv2,0 2px 8px 0 rgba(0,0,0,0.04));
    --maxw:760px;
    --font-sans:var(--dsw-font-family,-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif);
    --font-mono:var(--ds-font-family-code,'SF Mono','JetBrains Mono',Consolas,'PingFang SC','Microsoft YaHei');
  }
  /* dark palette = the dsh dark STATIC values. Standalone (file://) dark is
     the media query; inside the learning space the host marks <html> with
     ll-dark / ll-light instead and injects the resolved tokens. Media
     queries cannot be OR-ed with class selectors, hence the duplication. */
  @media (prefers-color-scheme:dark){html:not(.ll-light){
    color-scheme:dark;
    --bg:rgb(21,21,23); --surface:rgb(35,35,36); --surface-2:rgb(44,44,46); --skeleton:rgba(255,255,255,0.08);
    --text:rgb(249,250,251); --muted:rgb(207,211,214); --faint:rgb(173,178,184);
    --accent:rgb(103,158,254); --accent-soft:rgb(52,65,91); --accent-border:rgba(255,255,255,0.16);
    --hover:rgba(255,255,255,0.08);
    --border:rgba(255,255,255,0.06); --hairline:rgba(255,255,255,0.12);
    --obj-bg:rgb(52,65,91); --obj-bd:rgb(103,158,254);
    --kp-bg:rgb(39,36,31); --kp-bd:rgb(245,158,11); --kp-text:rgb(247,173,49);
    --ok:rgb(34,197,94); --err:rgb(242,90,90); --warn:rgb(245,158,11);
    --code-bg:rgb(27,27,28); --inline-code:rgb(44,44,46);
  }}
  /* in-space dark: ll-dark re-declares EVERY scheme-dependent var consuming
     the injected tokens with the dsh dark statics as fallback — tokens
     present → the host palette (incl. theme-plugin overrides) wins; a token
     snapshot gap → dark statics, never the light :root fallbacks (which
     paint a white canvas over the dark host). Keep the var list in sync
     with the :root block above. */
  html.ll-dark{
    color-scheme:dark;
    --bg:var(--dsw-alias-bg-base,rgb(21,21,23)); --surface:var(--dsw-alias-bg-layer-1,rgb(35,35,36)); --surface-2:var(--dsw-alias-bg-layer-2,rgb(44,44,46)); --skeleton:var(--dsw-alias-bg-skeleton,rgba(255,255,255,0.08));
    --text:var(--dsw-alias-label-primary,rgb(249,250,251)); --muted:var(--dsw-alias-label-secondary,rgb(207,211,214)); --faint:var(--dsw-alias-label-tertiary,rgb(173,178,184));
    --accent:var(--dsw-alias-state-business-primary,rgb(103,158,254)); --accent-soft:var(--dsw-alias-state-business-tertiary,rgb(52,65,91)); --accent-border:var(--dsw-alias-border-l3,rgba(255,255,255,0.16));
    --hover:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,0.08));
    --border:var(--dsw-alias-border-l1,rgba(255,255,255,0.06)); --hairline:var(--dsw-alias-border-l2,rgba(255,255,255,0.12));
    --obj-bg:var(--dsw-alias-state-business-tertiary,rgb(52,65,91)); --obj-bd:var(--dsw-alias-state-business-primary,rgb(103,158,254));
    --kp-bg:var(--dsw-alias-state-warn-tertiary,rgb(39,36,31)); --kp-bd:var(--dsw-alias-state-warn-primary,rgb(245,158,11)); --kp-text:var(--dsw-alias-state-warn-label,rgb(247,173,49));
    --ok:var(--dsw-alias-state-success-primary,rgb(34,197,94)); --err:var(--dsw-alias-state-error-primary,rgb(242,90,90)); --warn:var(--dsw-alias-state-warn-primary,rgb(245,158,11));
    --code-bg:var(--dsw-alias-markdown-code-block,rgb(27,27,28)); --inline-code:var(--dsw-alias-markdown-inline-code,rgb(44,44,46));
  }
  /* glass theme (host marks <html> with ll-glass while a glass skin like
     ui-aqua is active): the canvas takes NO fill of its own — the page sits
     directly on the host viewer card's glass, exactly like the sibling
     tree/notes cards. Only the CONTENT blocks paint translucent overlays
     ("glass in glass"), every overlay an alpha mix of the injected host
     tokens so light glass stays misty and dark glass stays deep-sea. The
     overlay alphas scale with the injected --dsh-aqua-frost knob (default
     1), so the user's frost slider drives the in-page frost too. (The blur
     knob cannot apply here: backdrop-filter inside an iframe cannot sample
     the host page behind it — blur is carried by the host card itself.) */
  html.ll-glass{
    --bg:transparent; --surface:transparent;
    --ll-frost:var(--dsh-aqua-frost, 1);
    --skeleton:color-mix(in srgb, var(--dsw-alias-bg-layer-2, #ffffff) calc(22% * var(--ll-frost)), transparent);
    --code-bg:color-mix(in srgb, var(--dsw-alias-markdown-code-block, rgb(249,250,251)) calc(55% * var(--ll-frost)), transparent);
    --inline-code:color-mix(in srgb, var(--dsw-alias-markdown-inline-code, rgb(235,238,242)) calc(65% * var(--ll-frost)), transparent);
    --obj-bg:color-mix(in srgb, var(--dsw-alias-state-business-tertiary, rgb(228,237,253)) calc(55% * var(--ll-frost)), transparent);
    --kp-bg:color-mix(in srgb, var(--dsw-alias-state-warn-tertiary, rgb(254,245,231)) calc(55% * var(--ll-frost)), transparent);
    --hover:color-mix(in srgb, var(--dsw-alias-interactive-bg-hover, rgba(38,49,72,0.06)) calc(75% * var(--ll-frost)), transparent);
  }
  /* content-block overlays: concept cards are light shells, the inner
     checkpoint details sit more opaque than their section */
  html.ll-glass ol.elements{background:color-mix(in srgb, var(--dsw-alias-bg-layer-1, #ffffff) calc(30% * var(--ll-frost)), transparent);}
  html.ll-glass section.checkpoint{background:color-mix(in srgb, var(--dsw-alias-state-business-tertiary, rgb(228,237,253)) calc(55% * var(--ll-frost)), transparent);}
  html.ll-glass section.checkpoint details{background:color-mix(in srgb, var(--dsw-alias-bg-layer-1, #ffffff) calc(45% * var(--ll-frost)), transparent);}
  html.ll-glass figure.viz{background:color-mix(in srgb, var(--dsw-alias-bg-layer-1, #ffffff) calc(30% * var(--ll-frost)), transparent);}
  *{box-sizing:border-box;}
  html{scroll-behavior:smooth;}
  body{font-family:var(--font-sans); background:var(--bg); color:var(--text); font:var(--dsw-font-markdown-base,16px/28px var(--font-sans)); margin:0; -webkit-font-smoothing:antialiased;}
  .page{display:flex; gap:48px; max-width:1080px; margin:0 auto; padding:40px 24px 96px;}

  /* dsh-flavored scrollbars (iframe scroller included) */
  html{scrollbar-width:thin; scrollbar-color:var(--dsw-alias-scrollbar-bg-l1,rgb(229,229,229)) transparent;}
  ::-webkit-scrollbar{width:8px; height:8px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{border-radius:4px; background:var(--dsw-alias-scrollbar-bg-l1,rgb(229,229,229));}

  /* sticky table of contents (CSS-only) */
  aside.toc{position:sticky; top:40px; align-self:flex-start; width:188px; flex:0 0 188px; font-size:.82rem; color:var(--muted);}
  aside.toc .toc-title{font-size:.72rem; text-transform:uppercase; letter-spacing:.08em; color:var(--faint); margin:0 0 10px 14px;}
  aside.toc nav{display:flex; flex-direction:column; gap:2px; border-left:1px solid var(--hairline);}
  aside.toc a{display:block; padding:6px 14px; color:var(--muted); text-decoration:none; border-left:2px solid transparent; margin-left:-1px; border-radius:0 var(--r-atom) var(--r-atom) 0; transition:background .1s var(--ease), color .1s var(--ease), border-color .1s var(--ease);}
  aside.toc a:hover{color:var(--text); border-left-color:var(--accent); background:var(--hover);}

  article.content{max-width:var(--maxw); width:100%; min-width:0;}
  .eyebrow{display:inline-flex; align-items:center; font-size:.78rem; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--accent); background:var(--accent-soft); border-radius:var(--r-atom); padding:3px 10px; margin-bottom:10px;}
  h1{font:var(--dsw-font-markdown-h1,700 24px/34px var(--font-sans)); margin:0 0 12px; letter-spacing:-.01em;}
  .meta{display:flex; flex-wrap:wrap; gap:8px; margin-bottom:28px;}
  .meta .chip{font-size:.78rem; color:var(--muted); background:var(--skeleton); border:1px solid var(--border); padding:3px 10px; border-radius:999px;}

  h2{font:var(--dsw-font-markdown-h3,700 20px/30px var(--font-sans)); margin:40px 0 14px; display:flex; align-items:baseline; gap:10px;}
  h2 .nh{color:var(--accent); font-size:.95rem; font-weight:700;}
  h3{font-size:1.12rem; margin:28px 0 10px; color:var(--text);}
  p{margin:0 0 14px;}

  /* callout cards: state-tertiary fill + primary left bar, dsh surface radius */
  .callout{border-radius:var(--r-surface); padding:14px 16px; margin:16px 0; border:1px solid transparent; border-left:3px solid var(--accent); background:var(--surface);}
  .callout .ct{font-weight:600; margin-bottom:6px; font-size:13px;}
  .objectives{background:var(--obj-bg); border-left-color:var(--obj-bd);} .objectives .ct{color:var(--obj-bd);}
  .objectives ul,.summary ul{margin:6px 0 0; padding-left:20px;}
  .kp{background:var(--kp-bg); border-left-color:var(--kp-bd);} .kp .ct{color:var(--kp-text);}
  .kp .hint{font-size:.82rem; color:var(--muted); margin:2px 0 10px;}
  .kp .kp-tags{display:flex; flex-wrap:wrap; gap:8px;}
  .kp .kp-tags span{font-size:.82rem; background:var(--bg); background:color-mix(in srgb, var(--kp-bg) 60%, var(--bg)); border:1px solid var(--kp-bd); color:var(--kp-text); padding:3px 10px; border-radius:999px; font-family:var(--font-mono);}
  .pitfall{background:color-mix(in srgb, var(--err) 10%, transparent); border-left-color:var(--err); margin:10px 0;} .pitfall .ct{color:var(--err);}
  .summary{background:color-mix(in srgb, var(--ok) 10%, transparent); border-left-color:var(--ok); margin-top:32px;} .summary .ct{color:var(--ok);}
  .summary .self{font-size:.88rem; color:var(--muted); margin-top:10px;}

  /* the six-element list — turns the wall-of-text into a scannable definition list */
  ol.elements{list-style:none; margin:10px 0 0; padding:0; border:1px solid var(--border); border-radius:var(--r-surface); overflow:hidden; background:var(--surface);}
  ol.elements > li{display:grid; grid-template-columns:148px 1fr; gap:6px 18px; padding:14px 18px; border-top:1px solid var(--border);}
  ol.elements > li:first-child{border-top:none;}
  ol.elements .el-label{font-weight:600; font-size:.85rem; color:var(--accent); background:var(--accent-soft); border:none; padding:4px 10px; border-radius:var(--r-atom); height:fit-content; white-space:nowrap;}
  ol.elements .el-body{min-width:0;} ol.elements .el-body p{margin:0 0 8px;} ol.elements .el-body p:last-child{margin-bottom:0;}

  /* element-body micro-formatting (anti wall-of-text): sub-lists & comparison tables */
  ol.elements .el-body ul, ol.elements .el-body ol{margin:6px 0 2px; padding-left:22px;}
  ol.elements .el-body ul li, ol.elements .el-body ol li{margin:5px 0;}
  ol.elements .el-body table{border-collapse:collapse; width:100%; margin:8px 0 2px; font-size:.92rem;}
  ol.elements .el-body th, ol.elements .el-body td{border:1px solid var(--hairline); padding:7px 10px; text-align:left; vertical-align:top;}
  ol.elements .el-body thead th{background:var(--skeleton); font-size:.85rem; font-weight:600;}
  ol.elements .el-body tbody tr:nth-child(even){background:var(--skeleton);}
  /* ② slot: the demo stays INSIDE the body column — a negative-margin
     "full-bleed" breakout pulled the figure across the ①-⑥ label column
     and covered the element labels (overlapping content bug). If a wider
     stage is needed, widen the grid's body column instead. */
  ol.elements .el-body figure.viz{margin:10px 0 4px; width:100%; max-width:100%;}
  /* observe-points list under the ② demo */
  ul.observe{margin:8px 0 0; padding-left:0; list-style:none; color:var(--muted); font-size:.92rem;}
  ul.observe li{margin:3px 0; padding-left:26px; position:relative;}
  ul.observe li::before{content:"👀"; position:absolute; left:0;}

  /* checkpoint (non-graded self-test) after each concept — details/summary, zero JS */
  section.checkpoint{border:1px solid var(--border); background:var(--accent-soft); border-radius:var(--r-surface); padding:14px 18px; margin:14px 0 28px;}
  section.checkpoint .cp-title{font-weight:600; color:var(--accent); font-size:.92rem; margin-bottom:6px;}
  section.checkpoint details{background:var(--bg); background:color-mix(in srgb, var(--surface) 70%, transparent); border:1px solid var(--hairline); border-radius:var(--r-ctrl); padding:8px 14px; margin:8px 0;}
  section.checkpoint summary{cursor:pointer; font-weight:600; font-size:.95rem; border-radius:var(--r-atom); transition:background .1s var(--ease);}
  section.checkpoint summary:hover{color:var(--accent); background:var(--hover);}
  section.checkpoint details .ans{margin-top:8px; padding-top:8px; border-top:1px dashed var(--hairline); color:var(--muted); font-size:.9rem;}

  /* study-route pill under the meta chips */
  .study-route{display:inline-block; font-size:.88rem; color:var(--muted); background:var(--skeleton); border:1px solid var(--border); border-radius:999px; padding:6px 16px; margin:0 0 28px;}

  /* assertion inventory inside the KP callout */
  .kp .kp-asserts{list-style:none; margin:10px 0 0; padding:10px 0 0 2px; border-top:1px dashed var(--kp-bd); font-size:.84rem; color:var(--kp-text);}
  .kp .kp-asserts li{margin:3px 0;}
  .kp .kp-asserts li strong{margin-right:4px;}

  /* embedded visualization component (loaded inline in the ② slot) */
  figure.viz{margin:18px 0 6px; border:1px solid var(--hairline); border-radius:var(--r-surface); overflow:hidden; box-shadow:var(--shadow-sm); background:var(--surface);}
  figure.viz figcaption{display:flex; align-items:center; gap:8px; padding:10px 14px; background:var(--accent-soft); color:var(--accent); font-weight:600; font-size:.9rem;}
  figure.viz iframe{display:block; width:100%; height:460px; border:0; background:var(--bg);} /* 默认高度；页面脚本会按演示实际高度自适应，避免裁切 */
  figure.viz .viz-open{display:block; padding:8px 14px; font-size:.78rem; color:var(--muted); border-top:1px solid var(--border); text-decoration:none; background:var(--bg);}
  figure.viz .viz-open:hover{color:var(--accent);}
  /* inside the learning space the link has no resolvable base URL (srcDoc)
     and the demo is already inlined — hide it there, keep it standalone */
  html.ll-dark .viz-open, html.ll-light .viz-open{display:none;}

  pre{background:var(--code-bg); border:1px solid var(--border); border-radius:var(--r-surface); padding:12px 14px; overflow-x:auto; margin:12px 0;}
  code{font-family:var(--font-mono); font-size:.88em;} pre code{font-size:13px; line-height:22px;}
  :not(pre)>code{background:var(--inline-code); padding:2px 6px; border-radius:5px;}
  .footer-note{margin-top:40px; padding-top:18px; border-top:1px solid var(--hairline); color:var(--muted); font-size:.92rem;}

  /* 补讲（超纲/补充教学）样式 */
  [id]{scroll-margin-top:24px;}
  .backfill-badge{display:inline-block; font-size:.68rem; font-weight:700; letter-spacing:.04em; color:var(--bg); background:var(--warn); padding:2px 8px; border-radius:999px; vertical-align:middle; margin-left:8px;}
  .backfill-meta{font-size:.82rem; color:var(--muted); margin:2px 0 10px;}
  aside.toc .toc-sub{font-size:.7rem; text-transform:uppercase; letter-spacing:.08em; color:var(--faint); margin:16px 0 6px 14px;}
  aside.toc a[href^="#backfill-"]::before{content:"＋ "; color:var(--warn); font-weight:700;}
  @media (max-width:900px){.page{display:block; padding:24px 16px 80px;} aside.toc{display:none;}}
</style>
</head>
<body>
<div class="page">
  <aside class="toc">
    <p class="toc-title">本章目录</p>
    <nav>
      <a href="#sec-obj">学习目标</a>
      <a href="#sec-intro">引入</a>
      <a href="#sec-kp">知识点清单</a>
      <a href="#sec-core">核心概念</a>
      <a href="#sec-practice">实战演示</a>
      <a href="#sec-pit">常见陷阱</a>
      <a href="#sec-summary">小结自查</a>
      <!-- 补讲（仅当本章有超纲补讲时才有）：在目录末尾按此格式追加，每个补讲一条快捷跳转 -->
      <!--
      <p class="toc-sub">补讲</p>
      <a href="#backfill-format-width-align">格式串的宽度与对齐</a>
      -->
    </nav>
  </aside>

  <article class="content">
    <div class="eyebrow">阶段< N > · 章节< XX ></div>
    <h1>&lt;title&gt;</h1>
    <div class="meta">
      <span class="chip">版本 v&lt;version&gt;</span>
      <span class="chip">前置：&lt;prev&gt;</span>
      <span class="chip">预计 &lt;X&gt;min</span>
    </div>
    <p class="study-route">🧭 学习路线：通读 → 每个概念：操作②的演示 + 做检查点 → 答错回看对应要素 → 全部通过后再开测验</p>

    <section id="sec-obj" class="callout objectives">
      <div class="ct">🎯 本章节目标</div>
      <div>学完后你应当能——</div>
      <ul><li>&lt;capability 1&gt;</li><li>&lt;capability 2&gt;</li></ul>
    </section>

    <h2 id="sec-intro"><span class="nh">01</span> 引入</h2>
    <p>&lt;一个真实问题或反直觉现象，2-4 句话&gt;</p>

    <section id="sec-kp" class="callout kp">
      <div class="ct">📋 知识点清单（本章覆盖度基准 + 考点断言）</div>
      <div class="hint">测验出题范围的唯一基准。每题考点必须映射到具体断言（Ax）；映射不到 = 超纲。</div>
      <div class="kp-tags">
        <span><strong>KP1</strong> · &lt;一句话知识点&gt;</span>
        <span><strong>KP2</strong> · &lt;一句话知识点&gt;</span>
        <span><strong>KP3</strong> · &lt;一句话知识点&gt;</span>
      </div>
      <ul class="kp-asserts">
        <li><strong>KP1·A1</strong> &lt;可考断言：一句可判对错的事实&gt;</li>
        <li><strong>KP1·A2</strong> &lt;…&gt;</li>
        <li><strong>KP2·A1</strong> &lt;…&gt;</li>
      </ul>
    </section>

    <h2 id="sec-core"><span class="nh">02</span> 核心概念</h2>

    <h3>1. &lt;concept&gt;（KPx）</h3>
    <ol class="elements">
      <li><span class="el-label">① 精确定义</span><div class="el-body">
        <ul>
          <li><strong>&lt;规则/情形一&gt;</strong>：&lt;≤2 句的精确表述，语法用 code&gt;</li>
          <li><strong>&lt;规则/情形二&gt;</strong>：&lt;…&gt;</li>
        </ul>
      </div></li>
      <li><span class="el-label">② 直观演示</span><div class="el-body">
        <figure class="viz">
          <figcaption>🖼️ 交互演示：&lt;机制名&gt;</figcaption>
          <!-- ⚠️ viz-dir locale rule: the demo dir is locale-mapped (en: viz/, zh: 演示/
               — see naming.md). The iframe src AND the viz-open href MUST use the
               WORKSPACE's dir name, and the demo files must be WRITTEN there: a zh
               workspace writes demos to 演示/ and references ./演示/….html — a
               mismatch shows the "演示文件缺失" placeholder in the learning space. -->
          <iframe src="./viz/stageN-chXX-<kp-slug>.html" loading="lazy" title="&lt;演示名&gt;"></iframe>
          <a class="viz-open" href="./viz/stageN-chXX-<kp-slug>.html" target="_blank">在新标签页打开 ↗</a>
        </figure>
        <ul class="observe">
          <li>&lt;点什么：操作哪个控件&gt;</li>
          <li>&lt;看什么：哪个状态如何变化&gt;</li>
          <li>&lt;验证哪条断言（KPx·Ay）&gt;</li>
        </ul>
        <!-- 仅纯记忆型 KP 可豁免演示：豁免时此要素写「演示豁免：理由」并用机制语言补一段可读的状态说明，禁止类比 -->
      </div></li>
      <li><span class="el-label">③ 最小例子</span><div class="el-body">
        <pre><code>&lt;≤10 行代码，期望输出写注释&gt;</code></pre>
      </div></li>
      <li><span class="el-label">④ 推导或代码</span><div class="el-body">
        <ol>
          <li>&lt;步骤一：一句推理&gt;</li>
          <li>&lt;步骤二：一句推理&gt;</li>
        </ol>
      </div></li>
      <li><span class="el-label">⑤ 边界条件</span><div class="el-body">
        <ul>
          <li><strong>&lt;场景一&gt;</strong>：&lt;代码/输入&gt; → &lt;结果&gt;。原因：&lt;一句&gt;</li>
          <li><strong>&lt;场景二&gt;</strong>：&lt;…&gt; → &lt;…&gt;。原因：&lt;…&gt;</li>
        </ul>
      </div></li>
      <li><span class="el-label">⑥ 与相关概念对比</span><div class="el-body">
        <table>
          <thead><tr><th>维度</th><th>本概念</th><th>易混淆概念 X</th></tr></thead>
          <tbody>
            <tr><td>&lt;维度一&gt;</td><td>…</td><td>…</td></tr>
            <tr><td>&lt;维度二&gt;</td><td>…</td><td>…</td></tr>
          </tbody>
        </table>
      </div></li>
    </ol>

    <section class="checkpoint">
      <div class="cp-title">🧪 检查点 · KPx（非计分，做完再往下）</div>
      <details>
        <summary>Q1（预测）：&lt;代码/场景——先写下预测，再到上面的演示里操作验证&gt;</summary>
        <div class="ans">&lt;答案 + 一句推理 + 回看指引（如「见⑤-场景二」）&gt;</div>
      </details>
      <details>
        <summary>Q2（判断+说理由）：&lt;一个说法，对还是错？为什么？&gt;</summary>
        <div class="ans">&lt;答案 + 推理&gt;</div>
      </details>
      <details>
        <summary>Q3（填关键值）：&lt;…&gt; _____</summary>
        <div class="ans">&lt;答案&gt;</div>
      </details>
    </section>

    <h3>2. &lt;concept&gt;（KPx）</h3>
    <!-- 同样结构：①列表化定义 ②内嵌演示+观察要点（豁免须写理由）③最小例子 ④步骤 ⑤case 列表 ⑥对比表 + 检查点 -->

    <!-- ====== 补讲（可选；仅当出现超纲补讲时才有）======
     位置：核心概念之后、实战演示之前。规范（必须全部遵守）：
     ① 放在 <h2 id="sec-backfill">补讲</h2> 之下；
     ② 每个补讲：<h3 id="backfill-<slug>">标题 <span class="backfill-badge">补讲</span></h3>
        + <p class="backfill-meta">KP·日期·来源（如：KP6 补充 · 2026-08-13 阶段总测验超纲补讲）</p>
        + 六要素 <ol class="elements">（与核心概念同结构；②直观演示在补讲中可豁免，豁免时写「演示豁免：理由」，
          并把新增断言补进 kp-asserts 清单）+ 检查点 1–2 题；
     ③ 在左侧 <aside class="toc"> 的 nav 末尾（小结自查之后）按 toc-sub 分组追加
        <a href="#backfill-<slug>">跳转链接</a>。详见 references/grading.md「补讲」。 -->
<!--
<h2 id="sec-backfill"><span class="nh">★</span> 补讲</h2>

<h3 id="backfill-format-width-align">格式串的宽度与对齐 <span class="backfill-badge">补讲</span></h3>
<p class="backfill-meta">KP6 补充 · 2026-08-13 阶段总测验超纲补讲</p>
<ol class="elements">
  <li><span class="el-label">① 精确定义</span><div class="el-body">…</div></li>
  <li><span class="el-label">② 直观演示</span><div class="el-body">演示豁免：&lt;纯记忆型/理由&gt;，用机制语言说明。</div></li>
  <li><span class="el-label">③ 最小例子</span><div class="el-body">…</div></li>
  <li><span class="el-label">④ 推导或代码</span><div class="el-body">…</div></li>
  <li><span class="el-label">⑤ 边界条件</span><div class="el-body">…</div></li>
  <li><span class="el-label">⑥ 与相关概念对比</span><div class="el-body">…</div></li>
</ol>
-->

<h2 id="sec-practice"><span class="nh">03</span> 实战演示</h2>
    <p>&lt;端到端例子，可复现命令/推导&gt;</p>
    <pre><code>&lt;代码或命令序列 + 预期输出&gt;</code></pre>

    <h2 id="sec-pit"><span class="nh">04</span> 常见陷阱 &amp; 易错点</h2>
    <div class="callout pitfall">
      <div class="ct">⚠️ 陷阱 1（关联 KP-x）</div>
      <div>&lt;描述&gt;</div>
    </div>
    <div class="callout pitfall">
      <div class="ct">⚠️ 陷阱 2</div>
      <div>&lt;描述&gt;</div>
    </div>

    <section id="sec-summary" class="callout summary">
      <div class="ct">✅ 小结 &amp; 自查</div>
      <ul>
        <li>&lt;takeaway 1&gt;</li>
        <li>&lt;takeaway 2&gt;</li>
      </ul>
      <div class="self">自测：对照知识点清单，你能否对每一项给出定义+例子？</div>
    </section>

    <p class="footer-note">所有检查点通过后，再打开对应的 <code>*-quiz.html</code> 测验作答。</p>
  </article>
</div>
<script>
  /* 演示自适应高度（read-mode 唯一的 JS，仅为演示可用性）：内嵌 viz iframe 通过 postMessage
     上报自身实际高度，父页据此调整对应 iframe 高度。file:// 双击打开同样生效。 */
  (function () {
    window.addEventListener('message', function (e) {
      var d = e.data;
      if (!d || typeof d.__vizHeight !== 'number' || d.__vizHeight <= 0) return;
      var frames = document.querySelectorAll('figure.viz iframe');
      for (var i = 0; i < frames.length; i++) {
        if (frames[i].contentWindow === e.source) {
          frames[i].style.height = Math.max(300, Math.min(1200, d.__vizHeight)) + 'px';
          break;
        }
      }
    });
  })();
</script>
<script>
/* Live theme channel (learning space): the host pushes palette updates so
   theme switches and glass-knob drags re-skin this page in place instead of
   reloading it (reloading would wipe in-progress quiz answers) — and this
   page forwards the update into its embedded demo iframes so they re-skin
   too. Standalone (file://) never receives a message. Keep verbatim. */
(function () {
  function llApplyTheme(t) {
    var el = document.getElementById('ll-theme');
    if (!el) { el = document.createElement('style'); el.id = 'll-theme'; document.head.appendChild(el); }
    el.textContent = ':root{' + t.css + '}html.' + (t.dark ? 'll-dark{color-scheme:dark}' : 'll-light{color-scheme:light}');
    var cl = document.documentElement.classList;
    cl.toggle('ll-dark', !!t.dark); cl.toggle('ll-light', !t.dark); cl.toggle('ll-glass', !!t.glass);
  }
  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (!d || d.type !== 'll-theme' || typeof d.css !== 'string') return;
    llApplyTheme(d);
    var frames = document.querySelectorAll('iframe');
    for (var i = 0; i < frames.length; i++) { try { frames[i].contentWindow.postMessage(d, '*'); } catch (e) {} }
    try { if (ev.source) ev.source.postMessage({ type: 'll-theme-ack', nonce: d.nonce }, '*'); } catch (e) {}
  });
})();
</script>
</body>
</html>
```

---

## quiz-form html skeleton — `quizzes/*.html` (baseline / chapter-quiz / stage-total-quiz)

Standalone, double-click-to-open, vanilla, no deps. User fills the form, clicks 提交, answers download as `<slug>-answers.json`. Full rules + submit JS in `references/html-format.md`.

> **⚠️ Provenance rule (load-bearing):** copy this skeleton + `<style>` **fresh from this file** on EVERY generation and EVERY rebuild. NEVER copy the `<style>`/structure from an existing sibling `quizzes/*.html` — siblings may come from an older skill version and propagate a stale visual skeleton (the body/JS contracts are stable, but the CSS is not). Every generated quiz MUST carry the `<!-- learning-loop skeleton: quiz-form -->` signature in its `<head>`; the main agent greps for it before shipping and regenerates if it's missing.

```html
<!DOCTYPE html>
<!-- set <html lang> per the workspace locale: zh workspaces lang="zh-CN", en workspaces lang="en" -->
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>章节测验 — 阶段< N >·章节< XX ></title>
<!-- learning-loop skeleton: quiz-form -->
<style>
  /* ===== dsh design system (same vars as read-mode chapter) =====
     Base colors CONSUME the dsh design tokens (--dsw-alias-*) with the dsh
     STATIC palette as fallback — see the read-mode skeleton note. Inside the
     learning space the injected ll-theme tokens win, including theme-plugin
     overrides (ui-aqua snapshots arrive already re-tinted). The accent is
     the dsh business blue family (state-business-*); --dsw-alias-brand-primary
     is monochrome black in dsh light mode and must NOT drive selection UI.
     NEVER define --dsw-* / --dsh-* variables here (contamination guard; the
     spaces around the slash matter: star-slash inside a CSS comment closes
     it early and the parser swallows the :root block as a bad selector). */
  :root{
    --bg:var(--dsw-alias-bg-base,#ffffff); --surface:var(--dsw-alias-bg-layer-1,#ffffff); --skeleton:var(--dsw-alias-bg-skeleton,rgba(0,0,0,0.04));
    --text:var(--dsw-alias-label-primary,rgb(15,17,21)); --muted:var(--dsw-alias-label-secondary,rgb(97,102,107)); --faint:var(--dsw-alias-label-tertiary,rgb(129,133,140));
    --ink-fg:var(--dsw-alias-label-primary-foreground,#ffffff);
    --accent:var(--dsw-alias-state-business-primary,rgb(65,118,230)); --accent-soft:var(--dsw-alias-state-business-tertiary,rgb(228,237,253));
    --hover:var(--dsw-alias-interactive-bg-hover,rgba(38,49,72,0.06));
    --border:var(--dsw-alias-border-l1,rgba(0,0,0,0.04)); --hairline:var(--dsw-alias-border-l2,rgba(0,0,0,0.1));
    --primary-fill:var(--dsw-alias-button-primary-fill,rgb(15,17,21)); --primary-hover:var(--dsw-alias-button-primary-hover,rgb(67,69,74));
    --ok:var(--dsw-alias-state-success-primary,rgb(34,197,94)); --ok-soft:var(--dsw-alias-state-success-tertiary,rgb(230,250,237));
    --err:var(--dsw-alias-state-error-primary,rgb(236,19,19)); --err-soft:rgba(254,242,242,0.9);
    --warn:var(--dsw-alias-state-warn-primary,rgb(245,158,11)); --warn-soft:var(--dsw-alias-state-warn-tertiary,rgb(254,245,231));
    --code-bg:var(--dsw-alias-markdown-code-block,rgb(249,250,251)); --inline-code:var(--dsw-alias-markdown-inline-code,rgb(235,238,242));
    /* corner language (dsh): surface 14 / control 10 / atom 8 */
    --r-sm:8px; --r-ctrl:10px; --r:14px; --r-lg:14px;
    --ease:var(--ds-ease-in-out,cubic-bezier(0.4,0,0.2,1));
    --font-sans:var(--dsw-font-family,-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif);
    --font-mono:var(--ds-font-family-code,'SF Mono','JetBrains Mono',Consolas,'PingFang SC','Microsoft YaHei');
    --shadow-sm:var(--dsw-shadow-lv1,0 2px 4px 0 rgba(0,0,0,0.05));
  }
  /* dark: standalone file:// follows the OS with the dsh dark static values;
     inside the learning space the host marks <html> with ll-dark / ll-light
     (same gating as read-mode) and injects the resolved tokens. */
  @media (prefers-color-scheme:dark){html:not(.ll-light){
    color-scheme:dark;
    --bg:rgb(21,21,23); --surface:rgb(35,35,36); --skeleton:rgba(255,255,255,0.08);
    --text:rgb(249,250,251); --muted:rgb(207,211,214); --faint:rgb(173,178,184);
    --ink-fg:rgb(15,17,21);
    --accent:rgb(103,158,254); --accent-soft:rgb(52,65,91);
    --hover:rgba(255,255,255,0.08);
    --border:rgba(255,255,255,0.06); --hairline:rgba(255,255,255,0.12);
    --primary-fill:rgb(249,250,251); --primary-hover:rgb(235,238,242);
    --ok:rgb(34,197,94); --ok-soft:rgb(35,60,44);
    --err:rgb(242,90,90); --err-soft:rgba(87,12,12,0.5);
    --warn:rgb(245,158,11); --warn-soft:rgb(39,36,31);
    --code-bg:rgb(27,27,28); --inline-code:rgb(44,44,46);
  }}
  /* in-space dark: full token-consuming restatement with dark static
     fallbacks — a token snapshot gap must land on the dark statics, never
     the light :root fallbacks (white canvas). Keep in sync with :root. */
  html.ll-dark{
    color-scheme:dark;
    --bg:var(--dsw-alias-bg-base,rgb(21,21,23)); --surface:var(--dsw-alias-bg-layer-1,rgb(35,35,36)); --skeleton:var(--dsw-alias-bg-skeleton,rgba(255,255,255,0.08));
    --text:var(--dsw-alias-label-primary,rgb(249,250,251)); --muted:var(--dsw-alias-label-secondary,rgb(207,211,214)); --faint:var(--dsw-alias-label-tertiary,rgb(173,178,184));
    --ink-fg:var(--dsw-alias-label-primary-foreground,rgb(15,17,21));
    --accent:var(--dsw-alias-state-business-primary,rgb(103,158,254)); --accent-soft:var(--dsw-alias-state-business-tertiary,rgb(52,65,91));
    --hover:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,0.08));
    --border:var(--dsw-alias-border-l1,rgba(255,255,255,0.06)); --hairline:var(--dsw-alias-border-l2,rgba(255,255,255,0.12));
    --primary-fill:var(--dsw-alias-button-primary-fill,rgb(249,250,251)); --primary-hover:var(--dsw-alias-button-primary-hover,rgb(235,238,242));
    --ok:var(--dsw-alias-state-success-primary,rgb(34,197,94)); --ok-soft:var(--dsw-alias-state-success-tertiary,rgb(35,60,44));
    --err:var(--dsw-alias-state-error-primary,rgb(242,90,90)); --err-soft:rgba(87,12,12,0.5);
    --warn:var(--dsw-alias-state-warn-primary,rgb(245,158,11)); --warn-soft:var(--dsw-alias-state-warn-tertiary,rgb(39,36,31));
    --code-bg:var(--dsw-alias-markdown-code-block,rgb(27,27,28)); --inline-code:var(--dsw-alias-markdown-inline-code,rgb(44,44,46));
  }
  /* glass theme (host marks <html> with ll-glass under a glass skin like
     ui-aqua): the canvas takes NO fill of its own — the page sits directly
     on the host viewer card's glass like the sibling tree/notes cards. Only
     content blocks paint translucent overlays ("glass in glass"): question
     cards are light shells, options/inputs sit MORE opaque than the cards,
     every overlay an alpha mix of the injected host tokens. Overlay alphas
     scale with the injected --dsh-aqua-frost knob (default 1), so the
     user's frost slider drives the in-page frost; blur cannot apply inside
     an iframe (the host card carries it). */
  html.ll-glass{
    --bg:transparent; --surface:transparent;
    --ll-frost:var(--dsh-aqua-frost, 1);
    --skeleton:color-mix(in srgb, var(--dsw-alias-bg-layer-2, #ffffff) calc(22% * var(--ll-frost)), transparent);
    --code-bg:color-mix(in srgb, var(--dsw-alias-markdown-code-block, rgb(249,250,251)) calc(55% * var(--ll-frost)), transparent);
    --inline-code:color-mix(in srgb, var(--dsw-alias-markdown-inline-code, rgb(235,238,242)) calc(65% * var(--ll-frost)), transparent);
    --ok-soft:color-mix(in srgb, var(--dsw-alias-state-success-tertiary, rgb(230,250,237)) calc(55% * var(--ll-frost)), transparent);
    --err-soft:color-mix(in srgb, var(--err, rgba(254,242,242,0.9)) calc(35% * var(--ll-frost)), transparent);
    --warn-soft:color-mix(in srgb, var(--dsw-alias-state-warn-tertiary, rgb(254,245,231)) calc(55% * var(--ll-frost)), transparent);
    --hover:color-mix(in srgb, var(--dsw-alias-interactive-bg-hover, rgba(38,49,72,0.06)) calc(75% * var(--ll-frost)), transparent);
  }
  /* glass layering: question card = light shell; option/input rows sit
     MORE opaque than the card (controls read as raised glass) */
  html.ll-glass fieldset.question{background:color-mix(in srgb, var(--dsw-alias-bg-layer-1, #ffffff) calc(30% * var(--ll-frost)), transparent);}
  html.ll-glass label.option, html.ll-glass input[type=text], html.ll-glass textarea{background:color-mix(in srgb, var(--dsw-alias-bg-layer-1, #ffffff) calc(55% * var(--ll-frost)), transparent);}
  html.ll-glass label.option:has(input:checked){background:color-mix(in srgb, var(--dsw-alias-state-business-tertiary, rgb(228,237,253)) calc(65% * var(--ll-frost)), transparent);}
  html.ll-glass .controls{background:linear-gradient(color-mix(in srgb, var(--dsw-alias-bg-base, #ffffff) calc(82% * var(--ll-frost)), transparent) 60%, transparent);}
  *{box-sizing:border-box;}
  html{scrollbar-width:thin; scrollbar-color:var(--dsw-alias-scrollbar-bg-l1,rgb(229,229,229)) transparent;}
  ::-webkit-scrollbar{width:8px;} ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{border-radius:4px; background:var(--dsw-alias-scrollbar-bg-l1,rgb(229,229,229));}
  body{font:var(--dsw-font-markdown-base,16px/28px var(--font-sans)); background:var(--bg); color:var(--text); max-width:860px; margin:0 auto; padding:40px 24px 140px; -webkit-font-smoothing:antialiased;}
  h1{font:var(--dsw-font-markdown-h2,700 22px/32px var(--font-sans)); margin:0 0 12px; letter-spacing:-.01em;}
  h1::before{content:"章节测验"; display:inline-flex; align-items:center; font-size:.78rem; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--accent); background:var(--accent-soft); border-radius:8px; padding:3px 10px; margin-bottom:8px;}
  h2{font-size:1.05rem; margin:32px 0 14px; padding-bottom:8px; border-bottom:1px solid var(--hairline); color:var(--muted);}
  .info{background:var(--accent-soft); border:none; border-radius:var(--r); padding:12px 16px; margin:0 0 24px; font-size:.92rem; color:var(--muted);}
  .info strong{color:var(--text);}
  .info code{background:var(--inline-code); padding:1px 5px; border-radius:4px;}
  /* question card: dsh surface = skeleton fill + l1 stroke + r14, no heavy shadow */
  fieldset.question{border:1px solid var(--border); border-radius:var(--r); padding:16px 18px; margin:12px 0; background:var(--skeleton);}
  fieldset.question legend{font-weight:600; font-size:1.02rem; color:var(--text); padding:0 4px;}
  .qmeta{display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:.78rem; color:var(--muted); margin:2px 0 12px;}
  .qmeta .pill{background:color-mix(in srgb, var(--skeleton) 50%, transparent); border:1px solid var(--border); border-radius:8px; padding:2px 8px; font-size:.72rem;}
  label.option{display:flex; align-items:center; gap:10px; padding:9px 12px; margin:5px 0; border:1px solid transparent; border-radius:var(--r-ctrl); cursor:pointer; background:var(--bg); font-size:14px; line-height:22px; transition:background .1s var(--ease), box-shadow .1s var(--ease);}
  label.option:hover{background:var(--hover);}
  label.option input{width:18px; height:18px; accent-color:var(--accent); cursor:pointer; margin:0; flex:0 0 18px;}
  label.option:has(input:checked){background:var(--accent-soft); box-shadow:inset 0 0 0 1px var(--accent);}
  textarea{width:100%; min-height:110px; padding:9px 12px; border:1px solid var(--hairline); border-radius:var(--r-ctrl); background:var(--bg); color:var(--text); font-family:inherit; font-size:.95rem; resize:vertical; line-height:1.6; transition:border-color .1s var(--ease);}
  input[type=text]{width:100%; max-width:360px; padding:9px 12px; border:1px solid var(--hairline); border-radius:var(--r-ctrl); background:var(--bg); color:var(--text); font-family:inherit; font-size:.95rem; transition:border-color .1s var(--ease);}
  textarea:focus, input[type=text]:focus{outline:none; border-color:var(--accent);}
  /* controls: dsh capsule buttons; primary = the monochrome brand fill
     (black in light / white in dark) like the host's own primary buttons */
  .controls{position:sticky; bottom:0; background:linear-gradient(var(--bg) 55%, transparent); padding:18px 0 6px; border-top:none; text-align:center; margin-top:24px;}
  button{height:40px; padding:0 22px; margin:0 6px; border:none; border-radius:20px; font-size:.95rem; line-height:22px; font-weight:500; cursor:pointer; font-family:inherit; transition:background .1s var(--ease);}
  #submitBtn{background:var(--primary-fill); color:var(--ink-fg);}
  #submitBtn:hover{background:var(--primary-hover);}
  #submitBtn:disabled{opacity:.4; cursor:not-allowed;}
  button[type=reset]{background:transparent; color:var(--muted); box-shadow:inset 0 0 0 1px var(--hairline);}
  button[type=reset]:hover{background:var(--hover); color:var(--text);}
  #answerOutput{background:var(--code-bg); color:var(--faint); border:1px solid var(--border); padding:12px 14px; border-radius:var(--r-sm); font-family:var(--font-mono); font-size:.8rem; white-space:pre-wrap; word-break:break-all; margin-top:14px;}
  /* 逐题批注位（每题 fieldset 内部，AI 批改后填充） — 机制与类名保持不变 */
  .feedback{margin-top:12px; padding:10px 14px; border-radius:var(--r-ctrl); font-size:.88rem; line-height:20px; display:none;}
  .feedback.shown{display:block;}
  .feedback.correct{background:var(--ok-soft); border-left:3px solid var(--ok);}
  .feedback.wrong{background:var(--err-soft); border-left:3px solid var(--err);}
  .feedback.partial{background:var(--warn-soft); border-left:3px solid var(--warn);}
  .feedback.out-of-scope{background:var(--accent-soft); border-left:3px solid var(--accent);}
  .feedback .verdict{font-weight:600;}
  .feedback.correct .verdict{color:var(--ok);}
  .feedback.wrong .verdict{color:var(--err);}
  .feedback.partial .verdict{color:var(--warn);}
  .feedback.out-of-scope .verdict{color:var(--accent);}
  /* 总分汇总条（批改后显示在提交按钮下方） */
  #gradingSummary{margin-top:20px; padding:14px 18px; border-radius:var(--r); background:var(--accent-soft); color:var(--text); font-size:1.05rem; font-weight:600;}
  #gradingSummary b{color:var(--accent);}
  /* 学习空间内交卷成功提示（standalone 场景保持隐藏） */
  #submitNotice{margin-top:14px; padding:11px 14px; border-radius:var(--r); display:none; font-size:.95rem; font-weight:500; background:var(--ok-soft); color:var(--ok);}
  .src-tag{font-size:.78rem; color:var(--faint);}
</style>
</head>
<body data-quiz="stageN-chXX-quiz">

<h1>章节测验 — 阶段< N >·章节< XX > &lt;title&gt;</h1>
<div class="info">
  通过线：与计划测验合并 ≥80%。每题标注考点 KP。<br>
  <strong>作答方式</strong>：选择题点选项，问答/实战题在输入框作答。完成后点底部「提交答案」——<strong>在学习空间中打开时会自动保存答案</strong>（回到聊天继续即可）；单独用浏览器打开时会下载 <code>&lt;quiz&gt;-answers.json</code>，把它放到测验文件旁边，然后在聊天里告诉 AI「做好了」。
</div>

<form id="quizForm" action="">

  <h2>一、选择题</h2>
  <fieldset class="question" data-qid="q1" data-kp="KP-2" data-assert="KP-2-A3" data-type="选择" data-points="1">
    <legend>1. &lt;题干&gt;</legend>
    <div class="qmeta">[考点: KP-2·A3] · (选择题, 1分)</div>
    <label class="option"><input type="radio" name="q1" value="A"> A. &lt;option&gt;</label>
    <label class="option"><input type="radio" name="q1" value="B"> B. &lt;option&gt;</label>
    <label class="option"><input type="radio" name="q1" value="C"> C. &lt;option&gt;</label>
    <label class="option"><input type="radio" name="q1" value="D"> D. &lt;option&gt;</label>
    <div class="feedback" id="fb-q1"></div>
  </fieldset>

  <fieldset class="question" data-qid="q2" data-kp="KP-3" data-assert="KP-3-A1,KP-3-A2" data-type="多选" data-points="2">
    <legend>2. &lt;题干&gt;（多选）</legend>
    <div class="qmeta">[考点: KP-3·A1, KP-3·A2] · (选择题[多选], 2分)</div>
    <label class="option"><input type="checkbox" name="q2" value="A"> A. &lt;option&gt;</label>
    <label class="option"><input type="checkbox" name="q2" value="B"> B. &lt;option&gt;</label>
    <label class="option"><input type="checkbox" name="q2" value="C"> C. &lt;option&gt;</label>
    <label class="option"><input type="checkbox" name="q2" value="D"> D. &lt;option&gt;</label>
    <div class="feedback" id="fb-q2"></div>
  </fieldset>

  <h2>二、填空题</h2>
  <fieldset class="question" data-qid="q3" data-kp="KP-1" data-assert="KP-1-A2" data-type="填空" data-points="1">
    <legend>3. &lt;题干&gt; _____</legend>
    <div class="qmeta">[考点: KP-1·A2] · (填空题, 1分)</div>
    <input type="text" id="q3" placeholder="你的答案">
    <div class="feedback" id="fb-q3"></div>
  </fieldset>

  <h2>三、实战题</h2>
  <fieldset class="question" data-qid="q4" data-kp="KP-3" data-assert="KP-3-A1" data-type="实战" data-points="4">
    <legend>4. &lt;题干：明确任务+输入+期望输出&gt;</legend>
    <div class="qmeta">[考点: KP-3·A1] · (实战题, 4分)</div>
    <textarea id="q4" placeholder="在此作答（可换行）"></textarea>
    <div class="feedback" id="fb-q4"></div>
  </fieldset>

  <h2>四、模拟题</h2>
  <fieldset class="question" data-qid="q5" data-kp="KP-4" data-assert="KP-4-A2" data-type="模拟" data-points="4">
    <legend>5. &lt;场景：… 你会如何 …&gt;</legend>
    <div class="qmeta">[考点: KP-4·A2] · (模拟题, 4分)</div>
    <textarea id="q5" placeholder="在此作答"></textarea>
    <div class="feedback" id="fb-q5"></div>
  </fieldset>

  <h2>五、算法 / 推导题</h2>
  <fieldset class="question" data-qid="q6" data-kp="KP-2" data-assert="KP-2-A4" data-type="算法" data-points="5">
    <legend>6. &lt;题干：请推导/设计 …&gt;</legend>
    <div class="qmeta">[考点: KP-2·A4] · (算法题, 5分)</div>
    <textarea id="q6" placeholder="在此作答"></textarea>
    <div class="feedback" id="fb-q6"></div>
  </fieldset>

  <h2>六、高难度综合题</h2>
  <fieldset class="question" data-qid="q7" data-kp="KP-1,KP-3" data-assert="KP-1-A2,KP-3-A1" data-type="综合" data-points="6">
    <legend>7. &lt;题干：综合 … 与 … 解决 …&gt;</legend>
    <div class="qmeta">[考点: KP-1·A2, KP-3·A1] · (综合题, 6分)</div>
    <textarea id="q7" placeholder="在此作答"></textarea>
    <div class="feedback" id="fb-q7"></div>
  </fieldset>

  <div class="controls">
    <button type="button" id="submitBtn">提交答案</button>
    <button type="reset">重置</button>
  </div>
</form>

<pre id="answerOutput" style="display:none;"></pre>
<div id="submitNotice"></div>

<!-- 总分汇总：批改后由 AI 填充（逐题批注已内联在各题的 .feedback 位） -->
<script id="restoreData" type="application/json" style="display:none;"></script>
<script id="quizKey" type="application/json" style="display:none;"></script>
<div id="gradingSummary" style="display:none;"></div>

<script>
(function () {
  'use strict';
  var form = document.getElementById('quizForm');
  var btn = document.getElementById('submitBtn');
  var out = document.getElementById('answerOutput');
  var notice = document.getElementById('submitNotice');

  /* ---- learning-space bridge: postMessage protocol (ll-submit / ll-read) ----
     Inside the learning space the page runs as srcDoc (no fetchable base
     URL), so submission and restore go through the host iframe bridge.
     Standalone (double-clicked file) the bridge is absent and the classic
     download / fetch flows apply. Copy this JS verbatim from the skeleton. */
  var inSpace = false;
  try { inSpace = window.parent !== window; } catch (e) {}
  var msgSeq = 0;
  function bridgeSend(message, timeoutMs) {
    return new Promise(function (resolve) {
      var timer = null;
      function onMsg(ev) {
        if (ev.source !== window.parent || !ev.data || ev.data.id !== message.id) return;
        window.removeEventListener('message', onMsg);
        if (timer) clearTimeout(timer);
        resolve(ev.data);
      }
      window.addEventListener('message', onMsg);
      timer = setTimeout(function () {
        window.removeEventListener('message', onMsg);
        resolve(null);
      }, timeoutMs || 4000);
      window.parent.postMessage(message, '*');
    });
  }

  function collect() {
    var answers = {};
    var groups = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === 'radio' && el.checked) {
        answers[el.name] = el.value;
      } else if (el.type === 'checkbox') {
        if (!groups[el.name]) groups[el.name] = [];
        if (el.checked) groups[el.name].push(el.value);
      }
    });
    Object.keys(groups).forEach(function (n) { answers[n] = groups[n]; });
    Array.prototype.forEach.call(form.querySelectorAll('input[type=text], textarea'), function (el) {
      if (el.id && el.value.trim()) answers[el.id] = el.value;
    });
    return answers;
  }

  function downloadFallback(json, slug) {
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = slug + '-answers.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  btn.addEventListener('click', function () {
    var slug = document.body.getAttribute('data-quiz');
    var payload = {
      quiz: slug,
      submitted_at: new Date().toISOString(),
      answers: collect()
    };
    var json = JSON.stringify(payload, null, 2);
    if (out) { out.textContent = json; out.style.display = 'block'; }
    try { localStorage.setItem('ll-answers-' + payload.quiz, json); } catch (e) {}
    if (inSpace) {
      btn.disabled = true;
      btn.textContent = '提交中…';
      bridgeSend({ type: 'll-submit', id: ++msgSeq, quiz: slug, answers: payload }).then(function (reply) {
        btn.disabled = false;
        btn.textContent = '提交答案';
        if (reply && reply.ok) {
          if (out) { out.style.display = 'none'; }
          if (notice) { notice.textContent = '✓ 已交卷：答案已保存到学习空间工作区，回到聊天继续即可。'; notice.style.display = 'block'; }
          return;
        }
        if (notice) {
          notice.textContent = '⚠ 保存失败（' + (reply && reply.error ? reply.error : '桥接超时') + '）。答案文件已下载，请放到测验文件旁边，然后在聊天里告诉 AI「做好了」。';
          notice.style.display = 'block';
        }
        downloadFallback(json, slug);
      });
      return;
    }
    downloadFallback(json, slug);
  });

  // ---- restore-on-load: refill form so refresh isn't blank ----
  function applyAnswers(answers) {
    Object.keys(answers).forEach(function (qid) {
      var val = answers[qid];
      Array.prototype.forEach.call(form.querySelectorAll('input[type=radio][name="' + qid + '"]'), function (el) {
        el.checked = (el.value === val);
      });
      if (Array.isArray(val)) {
        Array.prototype.forEach.call(form.querySelectorAll('input[type=checkbox][name="' + qid + '"]'), function (el) {
          el.checked = val.indexOf(el.value) !== -1;
        });
      }
      var txt = form.querySelector('#' + qid);
      if (txt && typeof val === 'string') txt.value = val;
    });
  }
  function restoreFromCache(slug) {
    try {
      var cached = localStorage.getItem('ll-answers-' + slug);
      if (cached) { var d = JSON.parse(cached); if (d && d.answers) applyAnswers(d.answers); }
    } catch (e) {}
  }
  function restore() {
    // Priority 0: inline data script (AI-injected at grading time — always works, no fetch/CORS needed)
    var dataEl = document.getElementById('restoreData');
    if (dataEl && dataEl.textContent.trim()) {
      try {
        var d = JSON.parse(dataEl.textContent);
        if (d && d.answers) { applyAnswers(d.answers); return; }
      } catch (e) {}
    }
    var slug = document.body.getAttribute('data-quiz');
    if (inSpace) {
      // The host derives the answers filename from the quiz file's stem plus
      // the WORKSPACE locale suffix ('-answers.json' en / '-答案.json' zh).
      // The page cannot know the locale, so try both candidates in order.
      function applyReply(content) {
        try {
          var data = JSON.parse(content);
          if (data && data.answers) {
            applyAnswers(data.answers);
            try { localStorage.setItem('ll-answers-' + slug, content); } catch (e) {}
            return true;
          }
        } catch (e) {}
        return false;
      }
      bridgeSend({ type: 'll-read', id: ++msgSeq, path: './' + slug + '-answers.json' }).then(function (reply) {
        if (reply && reply.ok && reply.content && applyReply(reply.content)) return;
        bridgeSend({ type: 'll-read', id: ++msgSeq, path: './' + slug + '-答案.json' }).then(function (reply2) {
          if (reply2 && reply2.ok && reply2.content && applyReply(reply2.content)) return;
          restoreFromCache(slug);
        });
      });
      return;
    }
    // Priority 1 standalone: fetch sibling answers.json (placed by user next to the html)
    fetch('./' + slug + '-answers.json')
      .then(function (r) { if (!r.ok) throw new Error('nf'); return r.json(); })
      .then(function (data) {
        if (data && data.answers) {
          applyAnswers(data.answers);
          try { localStorage.setItem('ll-answers-' + slug, JSON.stringify(data)); } catch (e) {}
        }
      })
      .catch(function () { restoreFromCache(slug); });
  }
  restore();
})();
</script>
<script>
/* Live theme channel (learning space): the host pushes palette updates so
   theme switches and glass-knob drags re-skin this page in place instead of
   reloading it — reloading would wipe in-progress answers. Standalone
   (file://) never receives a message. Keep verbatim. */
(function () {
  function llApplyTheme(t) {
    var el = document.getElementById('ll-theme');
    if (!el) { el = document.createElement('style'); el.id = 'll-theme'; document.head.appendChild(el); }
    el.textContent = ':root{' + t.css + '}html.' + (t.dark ? 'll-dark{color-scheme:dark}' : 'll-light{color-scheme:light}');
    var cl = document.documentElement.classList;
    cl.toggle('ll-dark', !!t.dark); cl.toggle('ll-light', !t.dark); cl.toggle('ll-glass', !!t.glass);
  }
  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (!d || d.type !== 'll-theme' || typeof d.css !== 'string') return;
    llApplyTheme(d);
    var frames = document.querySelectorAll('iframe');
    for (var i = 0; i < frames.length; i++) { try { frames[i].contentWindow.postMessage(d, '*'); } catch (e) {} }
    try { if (ev.source) ev.source.postMessage({ type: 'll-theme-ack', nonce: d.nonce }, '*'); } catch (e) {}
  });
})();
</script>
</body>
</html>
```

**Quiz-form non-negotiables:**
- **Style-token discipline (both skeletons):** copy the skeleton `<style>` verbatim — the `:root` layer consumes `--dsw-alias-*` tokens with the dsh static palette as fallback, and the accent is the `state-business-*` blue family. NEVER hardcode a palette color or invent accent variables (`--dsw-alias-brand-primary` is monochrome black in dsh light mode — do not bind selection/accent UI to it). `html.ll-glass` (glass themes like ui-aqua), `html.ll-dark` / `html.ll-light` (host marking) and the `prefers-color-scheme` fallback are all part of the skeleton — keep them intact.
- `<body data-quiz="<slug>">` carries the slug used in the answers filename. **The slug MUST equal the html file's own stem** (e.g. `stage1-ch01-quiz.html` → `stage1-ch01-quiz`): the host writes `<stem>-answers.json` next to the file, and the page's restore JS reads `<slug>-answers.json` — a mismatch silently breaks restore.
- Every question is a `<fieldset class="question" data-qid="qN" data-kp="..." data-assert="..." data-type="..." data-points="...">` — the AI reads these data-* attrs when grading (this replaces the inline `[考点: KP-x]` md tags). **`data-assert` carries the assertion IDs** (comma-separated when multiple, format `KP-2-A3`; prose displays it as `KP-2·A3`) — every listed assertion MUST exist in the chapter doc's 断言清单 (`kp-asserts`). A question whose assertion isn't listed there is 超纲 — rewrite it at generation time, don't wait for grading.
- Radio/checkbox `name` MUST equal the qid (`q1`); text/textarea `id` MUST equal the qid (`q3`). The submit JS relies on this exact mapping.
- `<form id="quizForm">`, `<button id="submitBtn" type="button">`, `<pre id="answerOutput">`, `<div id="submitNotice">`, `<script id="restoreData" ...>`, `<script id="quizKey" ...>`, `<div id="gradingSummary">` all required. Every question's `<fieldset>` MUST contain a `<div class="feedback" id="fb-qN">` slot (empty initially).
- The submit JS is the canonical version above — copy verbatim, do not rewrite. It implements the **learning-space bridge** (`ll-submit` postMessage, answers saved straight into the workspace with a download fallback when standalone) and the **restore-on-load** chain: inline restoreData → bridge `ll-read` (in-space) / sibling `fetch` (standalone) → `localStorage` cache. The submit handler, the `restore()` call, and the bridge helpers are all mandatory parts of the canonical JS.
- Set `<html lang>` per the workspace locale (`zh-CN` / `en`); the zh strings in this skeleton (提交答案 / 重置 / notices) are translated when generating en quizzes.
- Stage-total-quiz uses the SAME skeleton; just add more questions (≥2 per type, ≥2 综合) and `[出处: url]` spans inside the qmeta div for web-research citations.