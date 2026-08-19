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

Located at `00-baseline/baseline.html` (zh: `00-基线测评/基线测评.html`) — the degradation fallback of the quiz-form baseline; the user fills this in and submits per the answers protocol.

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
<style>
  body { font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif; max-width: 760px; margin: 24px auto; padding: 0 16px; color: #1a1a1a; }
  h1 { font-size: 1.3rem; }
  .stage { /* 主可视化区域 */ min-height: 240px; border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 12px 0; background: #fafafa; }
  .controls { margin: 12px 0; }
  .controls button, .controls input[type="range"] { padding: 6px 12px; margin-right: 8px; }
  .legend { font-size: 0.85rem; color: #666; margin-top: 8px; }
  /* 状态用颜色区分：新鲜/过期等 */
  .fresh { background: #d4edda; } .stale { background: #f8d7da; }
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
  function reportHeight(){ try { parent.postMessage({ __vizHeight: Math.ceil(document.documentElement.scrollHeight) }, '*'); } catch (e) {} }
  reportHeight();
  setTimeout(reportHeight, 150); setTimeout(reportHeight, 600);
  window.addEventListener('load', reportHeight);
  window.addEventListener('resize', reportHeight);
  if (window.MutationObserver) { new MutationObserver(reportHeight).observe(document.body, { childList: true, subtree: true, attributes: true }); }
})();
</script>
</body>
</html>
```

**Skeleton non-negotiables** (mirror `visualization.md`):
- All CSS/JS inline; no `<script src>`, no `<link>` to CDN.
- `'use strict'` and an IIFE wrapping the script (no globals leaking).
- At least one bound interaction (button/slider/click) that visibly changes the stage.
- A reset control.
- Chinese labels matching chapter terminology.
- The `render()` pattern: one function that reads `state` and repaints everything; interactions only mutate `state` then call `render()`. This avoids partial-update bugs.
- **Auto-height (keep the snippet):** the skeleton's `reportHeight()` posts `document.documentElement.scrollHeight` to the parent on load / resize / DOM-change; the chapter page resizes the iframe to fit. Never delete it or hard-set a tiny iframe height — clipped controls are the #1 demo usability bug.

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
  /* ===== shared design system (same vars as quiz-form) =====
     Base colors CONSUME the dsh design tokens (--dsw-alias-*) with
     standalone fallbacks: opened in a browser the fallbacks apply (dark via
     prefers-color-scheme), opened inside the learning space the injected
     ll-theme tokens win and the page follows the dsh host theme (and any
     theme plugin). NEVER define --dsw-*/--dsh-* variables here — consume
     them with fallbacks only (contamination guard). */
  :root{
    --bg:var(--dsw-alias-bg-base,#ffffff); --surface:var(--dsw-alias-bg-layer-1,#f7f8fa); --surface-2:var(--dsw-alias-bg-layer-2,#eef0f3);
    --text:var(--dsw-alias-label-primary,#1f2328); --muted:var(--dsw-alias-label-secondary,#57606a); --faint:var(--dsw-alias-label-tertiary,#8b949e);
    --accent:var(--dsw-alias-brand-primary,#4f46e5); --accent-soft:var(--dsw-alias-interactive-bg-hover,#eef2ff); --accent-border:var(--dsw-alias-border-l2,#c7d2fe);
    --border:var(--dsw-alias-border-l1,#d9dde3); --hairline:var(--dsw-alias-border-l2,#eceef1); --code-bg:var(--dsw-alias-markdown-code-block,#f6f8fa);
    --ok:var(--dsw-alias-state-success,#1a7f37); --err:var(--dsw-alias-state-error,#cf222e); --warn:var(--dsw-alias-state-warn-primary,#9a6700);
    --obj-bg:var(--dsw-alias-interactive-bg-hover,#eef2ff);  --obj-bd:var(--dsw-alias-brand-primary,#4f46e5);
    --kp-bg:#fffbeb;   --kp-bd:#fcd34d;  --kp-text:#92580a;
    --pit-bg:#fff7ed;  --pit-bd:#fb923c; --pit-text:#9a3412;
    --sum-bg:#f5f3ff;  --sum-bd:#a78bfa; --sum-text:#5b21b6;
    --r-sm:8px; --r:12px; --r-lg:16px;
    --shadow-sm:var(--dsw-shadow-lv1,0 1px 2px rgba(31,35,40,.06)); --shadow:var(--dsw-shadow-lv2,0 6px 20px rgba(31,35,40,.08));
    --maxw:760px;
    --font-sans:var(--dsw-font-family,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif);
    --font-mono:var(--ds-font-family-code,"SFMono-Regular",ui-monospace,"Cascadia Code",Consolas,monospace);
  }
  /* dark palette. Standalone (file://) dark = the media query with plain
     values (no dsh tokens exist there); inside the learning space the host
     theme class applies instead — ll-dark only re-tints the semantic
     callouts because the base vars already resolve from the injected
     tokens, and ll-light opts out of the OS media query. Media queries
     cannot be OR-ed with class selectors, hence the duplication. */
  @media (prefers-color-scheme:dark){html:not(.ll-light){
    --bg:#0d1117; --surface:#161b22; --surface-2:#21262d;
    --text:#e6edf3; --muted:#9198a1; --faint:#6e7681;
    --accent:#818cf8; --accent-soft:#1e1b4b; --accent-border:#4338ca;
    --border:#30363d; --hairline:#21262d; --code-bg:#161b22;
    --obj-bg:#1e1b4b; --kp-bg:#3b2f10; --kp-bd:#a16207; --kp-text:#fde68a;
    --pit-bg:#3b1d10; --pit-bd:#c2410c; --pit-text:#fed7aa;
    --sum-bg:#2e1065; --sum-bd:#7c3aed; --sum-text:#ddd6fe;
    --shadow:0 6px 24px rgba(0,0,0,.5);
  }}
  html.ll-dark{
    --kp-bg:#3b2f10; --kp-bd:#a16207; --kp-text:#fde68a;
    --pit-bg:#3b1d10; --pit-bd:#c2410c; --pit-text:#fed7aa;
    --sum-bg:#2e1065; --sum-bd:#7c3aed; --sum-text:#ddd6fe;
  }
  *{box-sizing:border-box;}
  html{scroll-behavior:smooth;}
  body{font-family:var(--font-sans); background:var(--bg); color:var(--text); line-height:1.75; margin:0; -webkit-font-smoothing:antialiased;}
  .page{display:flex; gap:48px; max-width:1080px; margin:0 auto; padding:40px 24px 96px;}

  /* sticky table of contents (CSS-only) */
  aside.toc{position:sticky; top:40px; align-self:flex-start; width:188px; flex:0 0 188px; font-size:.82rem; color:var(--muted);}
  aside.toc .toc-title{font-size:.72rem; text-transform:uppercase; letter-spacing:.08em; color:var(--faint); margin:0 0 10px 14px;}
  aside.toc nav{display:flex; flex-direction:column; gap:2px; border-left:1px solid var(--hairline);}
  aside.toc a{display:block; padding:6px 14px; color:var(--muted); text-decoration:none; border-left:2px solid transparent; margin-left:-1px; transition:.15s;}
  aside.toc a:hover{color:var(--accent); border-left-color:var(--accent); background:var(--accent-soft);}

  article.content{max-width:var(--maxw); width:100%; min-width:0;}
  .eyebrow{font-size:.78rem; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--accent); margin-bottom:6px;}
  h1{font-size:1.85rem; line-height:1.3; margin:0 0 12px; letter-spacing:-.01em;}
  .meta{display:flex; flex-wrap:wrap; gap:8px; margin-bottom:28px;}
  .meta .chip{font-size:.78rem; color:var(--muted); background:var(--surface); border:1px solid var(--border); padding:4px 10px; border-radius:999px;}

  h2{font-size:1.3rem; margin:44px 0 16px; padding-bottom:8px; border-bottom:1px solid var(--hairline); display:flex; align-items:baseline; gap:12px;}
  h2 .nh{color:var(--accent); font-size:.95rem; font-weight:700;}
  h3{font-size:1.12rem; margin:32px 0 10px; color:var(--text);}
  p{margin:0 0 14px;}

  /* callout cards */
  .callout{border-radius:var(--r); padding:16px 18px; margin:16px 0; border:1px solid var(--border); background:var(--surface); border-left:4px solid var(--accent);}
  .callout .ct{font-weight:700; margin-bottom:6px;}
  .objectives{background:var(--obj-bg); border-color:var(--obj-bd);} .objectives .ct{color:var(--obj-bd);}
  .objectives ul,.summary ul{margin:6px 0 0; padding-left:20px;}
  .kp{background:var(--kp-bg); border-color:var(--kp-bd);} .kp .ct{color:var(--kp-text);}
  .kp .hint{font-size:.82rem; color:var(--muted); margin:2px 0 10px;}
  .kp .kp-tags{display:flex; flex-wrap:wrap; gap:8px;}
  .kp .kp-tags span{font-size:.82rem; background:var(--bg); border:1px solid var(--kp-bd); color:var(--kp-text); padding:4px 11px; border-radius:999px;}
  .pitfall{background:var(--pit-bg); border-color:var(--pit-bd); margin:10px 0;} .pitfall .ct{color:var(--pit-text);}
  .summary{background:var(--sum-bg); border-color:var(--sum-bd); margin-top:32px;} .summary .ct{color:var(--sum-text);}
  .summary .self{font-size:.88rem; color:var(--muted); margin-top:10px;}

  /* the six-element list — turns the wall-of-text into a scannable definition list */
  ol.elements{list-style:none; margin:10px 0 0; padding:0; border:1px solid var(--hairline); border-radius:var(--r); overflow:hidden;}
  ol.elements > li{display:grid; grid-template-columns:148px 1fr; gap:6px 18px; padding:14px 18px; border-top:1px solid var(--hairline);}
  ol.elements > li:first-child{border-top:none;}
  ol.elements .el-label{font-weight:700; font-size:.85rem; color:var(--accent); background:var(--accent-soft); border:1px solid var(--accent-border); padding:4px 10px; border-radius:var(--r-sm); height:fit-content; white-space:nowrap;}
  ol.elements .el-body{min-width:0;} ol.elements .el-body p{margin:0 0 8px;} ol.elements .el-body p:last-child{margin-bottom:0;}

  /* element-body micro-formatting (anti wall-of-text): sub-lists & comparison tables */
  ol.elements .el-body ul, ol.elements .el-body ol{margin:6px 0 2px; padding-left:22px;}
  ol.elements .el-body ul li, ol.elements .el-body ol li{margin:5px 0;}
  ol.elements .el-body table{border-collapse:collapse; width:100%; margin:8px 0 2px; font-size:.92rem;}
  ol.elements .el-body th, ol.elements .el-body td{border:1px solid var(--border); padding:7px 10px; text-align:left; vertical-align:top;}
  ol.elements .el-body thead th{background:var(--surface-2); font-size:.85rem;}
  ol.elements .el-body tbody tr:nth-child(even){background:var(--surface);}
  /* ② slot: the embedded demo breaks out to the card's full width (label col 148px + 18px gap) */
  ol.elements .el-body figure.viz{margin:10px 0 4px -166px; width:calc(100% + 166px); max-width:calc(100% + 166px);}
  /* observe-points list under the ② demo */
  ul.observe{margin:8px 0 0; padding-left:0; list-style:none; color:var(--muted); font-size:.92rem;}
  ul.observe li{margin:3px 0; padding-left:26px; position:relative;}
  ul.observe li::before{content:"👀"; position:absolute; left:0;}

  /* checkpoint (non-graded self-test) after each concept — details/summary, zero JS */
  section.checkpoint{border:1px dashed var(--accent-border); background:var(--accent-soft); border-radius:var(--r); padding:14px 18px; margin:14px 0 28px;}
  section.checkpoint .cp-title{font-weight:700; color:var(--accent); font-size:.92rem; margin-bottom:6px;}
  section.checkpoint details{background:var(--bg); border:1px solid var(--hairline); border-radius:var(--r-sm); padding:8px 14px; margin:8px 0;}
  section.checkpoint summary{cursor:pointer; font-weight:600; font-size:.95rem;}
  section.checkpoint summary:hover{color:var(--accent);}
  section.checkpoint details .ans{margin-top:8px; padding-top:8px; border-top:1px dashed var(--hairline); color:var(--muted); font-size:.9rem;}

  /* study-route pill under the meta chips */
  .study-route{display:inline-block; font-size:.88rem; color:var(--muted); background:var(--surface); border:1px solid var(--border); border-radius:999px; padding:6px 16px; margin:0 0 28px;}

  /* assertion inventory inside the KP callout */
  .kp .kp-asserts{list-style:none; margin:10px 0 0; padding:10px 0 0 2px; border-top:1px dashed var(--kp-bd); font-size:.84rem; color:var(--kp-text);}
  .kp .kp-asserts li{margin:3px 0;}
  .kp .kp-asserts li strong{margin-right:4px;}

  /* embedded visualization component (loaded inline in the ② slot) */
  figure.viz{margin:18px 0 6px; border:1px solid var(--border); border-radius:var(--r); overflow:hidden; box-shadow:var(--shadow-sm); background:var(--surface);}
  figure.viz figcaption{display:flex; align-items:center; gap:8px; padding:10px 14px; background:var(--accent-soft); color:var(--accent); font-weight:600; font-size:.9rem;}
  figure.viz iframe{display:block; width:100%; height:460px; border:0; background:var(--bg);} /* 默认高度；页面脚本会按演示实际高度自适应，避免裁切 */
  figure.viz .viz-open{display:block; padding:8px 14px; font-size:.78rem; color:var(--muted); border-top:1px solid var(--hairline); text-decoration:none; background:var(--bg);}
  figure.viz .viz-open:hover{color:var(--accent);}
  /* inside the learning space the link has no resolvable base URL (srcDoc)
     and the demo is already inlined — hide it there, keep it standalone */
  html.ll-dark .viz-open, html.ll-light .viz-open{display:none;}

  pre{background:var(--code-bg); border:1px solid var(--hairline); border-radius:var(--r-sm); padding:14px 16px; overflow-x:auto; margin:12px 0;}
  code{font-family:var(--font-mono); font-size:.88em;} pre code{font-size:.85rem;}
  :not(pre)>code{background:var(--surface-2); padding:2px 6px; border-radius:5px;}
  .footer-note{margin-top:40px; padding-top:18px; border-top:1px solid var(--hairline); color:var(--muted); font-size:.92rem;}

  /* 补讲（超纲/补充教学）样式 */
  [id]{scroll-margin-top:24px;}
  .backfill-badge{display:inline-block; font-size:.68rem; font-weight:700; letter-spacing:.04em; color:#fff; background:#f59e0b; padding:2px 8px; border-radius:999px; vertical-align:middle; margin-left:8px;}
  .backfill-meta{font-size:.82rem; color:var(--muted); margin:2px 0 10px;}
  aside.toc .toc-sub{font-size:.7rem; text-transform:uppercase; letter-spacing:.08em; color:var(--faint); margin:16px 0 6px 14px;}
  aside.toc a[href^="#backfill-"]::before{content:"＋ "; color:#f59e0b; font-weight:700;}
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
  /* ===== shared design system (same vars as read-mode chapter) =====
     Base colors CONSUME the dsh design tokens (--dsw-alias-*) with
     standalone fallbacks — see the read-mode skeleton note. NEVER define
     --dsw-*/--dsh-* variables here (contamination guard). */
  :root{
    --bg:var(--dsw-alias-bg-base,#ffffff); --surface:var(--dsw-alias-bg-layer-1,#f7f8fa); --surface-2:var(--dsw-alias-bg-layer-2,#eef0f3);
    --text:var(--dsw-alias-label-primary,#1f2328); --muted:var(--dsw-alias-label-secondary,#57606a); --faint:var(--dsw-alias-label-tertiary,#8b949e);
    --accent:var(--dsw-alias-brand-primary,#4f46e5); --accent-soft:var(--dsw-alias-interactive-bg-hover,#eef2ff); --accent-border:var(--dsw-alias-border-l2,#c7d2fe);
    --border:var(--dsw-alias-border-l1,#d9dde3); --hairline:var(--dsw-alias-border-l2,#eceef1); --code-bg:var(--dsw-alias-markdown-code-block,#161b22);
    --ok:var(--dsw-alias-state-success,#1a7f37); --err:var(--dsw-alias-state-error,#cf222e); --warn:var(--dsw-alias-state-warn-primary,#9a6700);
    --r-sm:8px; --r:12px; --r-lg:16px; --shadow-sm:var(--dsw-shadow-lv1,0 1px 2px rgba(31,35,40,.06));
    --font-sans:var(--dsw-font-family,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif);
    --font-mono:var(--ds-font-family-code,"SFMono-Regular",ui-monospace,"Cascadia Code",Consolas,monospace);
  }
  /* dark: standalone file:// follows the OS; inside the learning space the
     host marks <html> with ll-dark / ll-light (same gating as read-mode). */
  @media (prefers-color-scheme:dark){html:not(.ll-light){
    --bg:#0d1117; --surface:#161b22; --surface-2:#21262d;
    --text:#e6edf3; --muted:#9198a1; --faint:#6e7681;
    --accent:#818cf8; --accent-soft:#1e1b4b; --accent-border:#4338ca;
    --border:#30363d; --hairline:#21262d; --code-bg:#0d1117;
  }}
  html.ll-dark{
    --kp-bg:#3b2f10; --kp-bd:#a16207; --kp-text:#fde68a;
  }
  *{box-sizing:border-box;}
  body{font-family:var(--font-sans); background:var(--bg); color:var(--text); line-height:1.7; max-width:860px; margin:0 auto; padding:40px 24px 140px; -webkit-font-smoothing:antialiased;}
  h1{font-size:1.6rem; margin:0 0 16px; letter-spacing:-.01em; border-bottom:none; padding-bottom:0;}
  h1::before{content:"章节测验"; display:block; font-size:.78rem; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--accent); margin-bottom:6px;}
  h2{font-size:1.05rem; margin:32px 0 14px; padding-bottom:8px; border-left:none; padding-left:0; border-bottom:1px solid var(--hairline); color:var(--muted);}
  .info{background:var(--accent-soft); border:1px solid var(--accent-border); border-left:4px solid var(--accent); border-radius:var(--r); padding:14px 16px; margin:0 0 28px; font-size:.92rem; color:var(--text);}
  .info strong{color:var(--accent);}
  .info code{background:var(--surface-2); padding:1px 5px; border-radius:4px;}
  fieldset.question{border:1px solid var(--border); border-radius:var(--r-lg); padding:16px 18px; margin:14px 0; background:var(--bg); box-shadow:var(--shadow-sm);}
  fieldset.question legend{font-weight:700; font-size:1.02rem; color:var(--text); padding:0 4px;}
  .qmeta{font-size:.78rem; color:var(--muted); margin:4px 0 12px;}
  label.option{display:flex; align-items:center; gap:10px; padding:10px 12px; margin:6px 0; border:1px solid var(--hairline); border-radius:var(--r-sm); cursor:pointer; transition:.15s; background:var(--bg);}
  label.option:hover{border-color:var(--accent-border); background:var(--accent-soft);}
  label.option input{width:18px; height:18px; accent-color:var(--accent); cursor:pointer; margin:0; flex:0 0 18px;}
  label.option:has(input:checked){border-color:var(--accent); background:var(--accent-soft);}
  textarea{width:100%; min-height:110px; padding:10px 12px; border:1px solid var(--border); border-radius:var(--r-sm); background:var(--bg); color:var(--text); font-family:inherit; font-size:.95rem; resize:vertical; line-height:1.6; transition:.15s;}
  input[type=text]{width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:var(--r-sm); background:var(--bg); color:var(--text); font-family:inherit; font-size:.95rem; transition:.15s;}
  textarea:focus, input[type=text]:focus{outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-soft);}
  .controls{position:sticky; bottom:0; background:linear-gradient(var(--bg) 55%, transparent); padding:18px 0; border-top:none; text-align:center; margin-top:24px;}
  button{padding:12px 30px; margin:0 8px; border:none; border-radius:var(--r-sm); font-size:1rem; cursor:pointer; font-weight:600; font-family:inherit; transition:.15s;}
  #submitBtn{background:var(--accent); color:#fff; box-shadow:var(--shadow-sm);}
  #submitBtn:hover{filter:brightness(1.08);}
  button[type=reset]{background:var(--surface); color:var(--muted); border:1px solid var(--border);}
  button[type=reset]:hover{color:var(--text);}
  #answerOutput{background:var(--code-bg); color:#9ca3af; border:1px solid var(--hairline); padding:14px 16px; border-radius:var(--r-sm); font-family:var(--font-mono); font-size:.82rem; white-space:pre-wrap; word-break:break-all; margin-top:16px;}
  /* 逐题批注位（每题 fieldset 内部，AI 批改后填充） — 机制与类名保持不变 */
  .feedback{margin-top:12px; padding:10px 14px; border-radius:var(--r-sm); font-size:.88rem; display:none;}
  .feedback.shown{display:block;}
  .feedback.correct{background:color-mix(in srgb,var(--ok) 12%,transparent); border-left:4px solid var(--ok);}
  .feedback.wrong{background:color-mix(in srgb,var(--err) 12%,transparent); border-left:4px solid var(--err);}
  .feedback.partial{background:color-mix(in srgb,var(--warn) 14%,transparent); border-left:4px solid var(--warn);}
  .feedback.out-of-scope{background:color-mix(in srgb,var(--accent) 12%,transparent); border-left:4px solid var(--accent);}
  .feedback .verdict{font-weight:700;}
  .feedback.correct .verdict{color:var(--ok);}
  .feedback.wrong .verdict{color:var(--err);}
  .feedback.partial .verdict{color:var(--warn);}
  .feedback.out-of-scope .verdict{color:var(--accent);}
  /* 总分汇总条（批改后显示在提交按钮下方） */
  #gradingSummary{margin-top:20px; padding:16px 20px; border-radius:var(--r); background:var(--accent-soft); border:1px solid var(--accent-border); font-size:1.08rem; font-weight:700; color:var(--accent);}
  /* 学习空间内交卷成功提示（standalone 场景保持隐藏） */
  #submitNotice{margin-top:16px; padding:12px 16px; border-radius:var(--r); display:none; font-size:.95rem; font-weight:600; background:color-mix(in srgb,var(--ok) 14%,transparent); border:1px solid var(--ok); color:var(--ok);}
  .src-tag{font-size:.78rem; color:var(--accent);}
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
      // Priority 1 in-space: ask the host bridge to read the sibling answers file
      bridgeSend({ type: 'll-read', id: ++msgSeq, path: './' + slug + '-answers.json' }).then(function (reply) {
        if (reply && reply.ok && reply.content) {
          try {
            var data = JSON.parse(reply.content);
            if (data && data.answers) {
              applyAnswers(data.answers);
              try { localStorage.setItem('ll-answers-' + slug, reply.content); } catch (e) {}
              return;
            }
          } catch (e) {}
        }
        restoreFromCache(slug);
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
</body>
</html>
```

**Quiz-form non-negotiables:**
- `<body data-quiz="<slug>">` carries the slug used in the answers filename.
- Every question is a `<fieldset class="question" data-qid="qN" data-kp="..." data-assert="..." data-type="..." data-points="...">` — the AI reads these data-* attrs when grading (this replaces the inline `[考点: KP-x]` md tags). **`data-assert` carries the assertion IDs** (comma-separated when multiple, format `KP-2-A3`; prose displays it as `KP-2·A3`) — every listed assertion MUST exist in the chapter doc's 断言清单 (`kp-asserts`). A question whose assertion isn't listed there is 超纲 — rewrite it at generation time, don't wait for grading.
- Radio/checkbox `name` MUST equal the qid (`q1`); text/textarea `id` MUST equal the qid (`q3`). The submit JS relies on this exact mapping.
- `<form id="quizForm">`, `<button id="submitBtn" type="button">`, `<pre id="answerOutput">`, `<div id="submitNotice">`, `<script id="restoreData" ...>`, `<script id="quizKey" ...>`, `<div id="gradingSummary">` all required. Every question's `<fieldset>` MUST contain a `<div class="feedback" id="fb-qN">` slot (empty initially).
- The submit JS is the canonical version above — copy verbatim, do not rewrite. It implements the **learning-space bridge** (`ll-submit` postMessage, answers saved straight into the workspace with a download fallback when standalone) and the **restore-on-load** chain: inline restoreData → bridge `ll-read` (in-space) / sibling `fetch` (standalone) → `localStorage` cache. The submit handler, the `restore()` call, and the bridge helpers are all mandatory parts of the canonical JS.
- Set `<html lang>` per the workspace locale (`zh-CN` / `en`); the zh strings in this skeleton (提交答案 / 重置 / notices) are translated when generating en quizzes.
- Stage-total-quiz uses the SAME skeleton; just add more questions (≥2 per type, ≥2 综合) and `[出处: url]` spans inside the qmeta div for web-research citations.