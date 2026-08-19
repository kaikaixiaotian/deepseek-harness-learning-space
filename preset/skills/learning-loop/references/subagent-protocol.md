# Subagent Protocol

Five jobs in the learning loop are delegated to subagents via the DSH `subagent` (isolated) / `subagent_fork` (context-inheriting) tools. Subagents run isolated — they cannot see this conversation, so every dispatch must be **self-contained**: include the templates, the wiki input, and the exact output path.

## When to use a subagent (and when not)

| Job | Subagent? | Why |
|-----|-----------|-----|
| Write chapter wiki after pass | ✅ yes | Isolated summarization; keeps main thread lean |
| Plan + draft next chapter + quiz | ✅ yes | Adapts to wiki; substantial generation |
| Plan a whole new stage | ✅ yes | Larger planning task |
| **Fetch authoritative web data for stage-total** | ✅ yes | Volume + factual rigor required; isolated fetch keeps main thread lean |
| **Fetch canonical learning path + per-chapter cards (curriculum)** | ✅ yes | Grounding the master plan in real curricula; the biggest anti-"messy plan" fix |
| Grade a quiz | ❌ no | Needs conversational context + user's answers; do inline |
| Run the plan-quiz | ❌ no | It's a live back-and-forth; do inline |
| Rebuild a failed chapter | ❌ no | Needs the specific failure analysis from the just-graded quiz; do inline |

The rebuild case is intentional: the main thread just saw exactly what the user got wrong, so it's best positioned to rewrite the chapter. Subagents are for forward planning, not error response.

## Common dispatch rules (all jobs)

1. **Inline the templates and rules.** Subagents start cold with no conversation context. Inline the relevant template sections (from `references/templates.md`), the quiz-type floor rules (from `references/quiz-types.md`), and any grading rules they need (from `references/grading.md`) directly in the prompt. Do not tell a subagent to "read references/templates.md" — point it at files *inside the learning workspace* (which do exist on disk) only for content it must absorb, and even then prefer pasting that content inline for reliability.
2. **Inline the wiki.** If the job depends on prior learning state, paste the contents of the relevant wiki file(s) inline.
3. **Specify the output path(s) absolutely AND localized.** Tell the subagent exactly which file(s) to write and their full paths. The placeholder paths in the skeletons below (like `<wiki-dir>/stageN-chXX-wiki.md`) are en logical names — YOU must fill in the real absolute path derived from the workspace's `meta.json.locale` per `references/naming.md` (e.g. zh workspace: `<workspace>/知识库/阶段1-章01-知识.md`). Never hand a subagent an English literal path for a zh workspace.
4. **Specify the format.** "Return the written file path and a 3-line summary of what you produced. Do not dump the full content back."
5. **Give the calibration inputs.** `baseline_score`, `target_level`, current stage/chapter, and the user's known weak spots from the wiki.
6. **One job per subagent.** Don't ask one subagent to both write the wiki and plan the next chapter — the wiki must exist *before* the next chapter is planned, so sequence them.

## Job 1: Wiki writer (after a chapter passes)

**Input to pass:** the chapter doc path, the graded chapter quiz, the plan-quiz Q&A and score, and the topic/stage/chapter identifiers.

**Prompt skeleton:**

```
You are recording a learning-progress wiki for an AI tutoring system.

Context:
- Topic: <topic>
- Stage <N>, Chapter <XX>: <title>
- Chapter doc: <path>  [USE THE read tool ON THIS PATH]
- Chapter quiz (graded): <paste inline>
- Plan-quiz Q&A and combined score: <paste inline>

Use the `read` tool on the chapter doc path above, then use the `write` tool to write the file
<abs path to <wiki-dir>/stageN-chXX-wiki.md  (localized per naming.md)> with EXACTLY this structure:
<paste the wiki schema from references/wiki-schema.md inline here>

Be specific and honest — this file guides how the NEXT chapter is planned.
Mention concrete misconceptions, not vague "needs practice".

Return only: the file path you wrote and a 3-line summary.
```

After it returns, **append a one-line entry to `wiki/progress.md`** and update `meta.json` (chapter status, plan-quiz score).

## Job 2: Next-chapter planner (after wiki is written)

**Input to pass:** the master plan (so it knows which chapter is next), the just-written chapter wiki, the user's `baseline_score` and accumulated weak spots, and the absolute output paths.

**Prompt skeleton:**

```
You are planning the next chapter of an AI tutoring system.

Context:
- Topic: <topic>, target level: <level>
- User baseline score: <x> (0..1)
- Master plan path: <abs path to <plan-dir>/master-plan.html  (localized per naming.md)>  [USE THE read tool ON THIS]
- Previous chapter's wiki (READ THIS WITH THE read tool — adapt to what it says): <path>
- Known weak spots across all chapters so far (inline): <bulleted list distilled from wikis>

The NEXT chapter to build is Stage <N> Chapter <XX>: <slug> — <objective>.

Produce TWO files (BOTH are HTML — see references/html-format.md):
1. <abs path to <chapters-dir>/stageN-chXX-<slug>.html> — the chapter doc (read-mode HTML; localized per naming.md)
2. <abs path to <quizzes-dir>/stageN-chXX-quiz.html> — its quiz (quiz-form HTML; localized per naming.md)

Chapter doc template (follow exactly):
<paste the read-mode HTML skeleton from references/templates.md inline — note the
NEW 知识点清单 (KP list) section and the six-element structure for 核心概念>

TEACHING DEPTH RULES (non-negotiable):
- The chapter MUST open with a 知识点清单 + 考点断言: 4–8 knowledge points
  (KP1, KP2, …), each a one-liner mapping to a 核心概念 subsection, AND under
  each KP 3–6 testable assertions (A1, A2… — one judgeable fact each, e.g.
  「`b = a` 复制的是引用值，堆上不出现新对象」). Every ⑤边界条件 case MUST have a
  corresponding assertion. The assertion inventory is the SOLE basis for what
  the quiz may test — a question testing an unlisted assertion is out-of-scope.
- Every 核心概念 subsection MUST have all six elements + a checkpoint:
  ①精确定义 (formula/signature/syntax — verifiable), ②直观演示 (an EMBEDDED
  interactive demo + 观察要点 — see VISUALIZATION below), ③最小例子 (≤10 lines,
  expected output as comments), ④推导或代码 (numbered steps, one sentence per
  step), ⑤边界条件 (a `<ul>` of discrete cases: 场景→结果→一句原因), ⑥与相关概念
  对比 (a `<table>` when comparing ≥2 concepts on ≥2 dimensions).
- FORMATTING (anti wall-of-text — hard rules): in ① each independent rule gets
  its own `<li>`, ≤2 sentences each, bold labels for parallel cases; ⑤ must be
  a `<ul>` — NEVER inline "a) b) c)" inside one `<p>`; no el-body paragraph may
  enumerate multiple facts — split into list items.
- ANALOGIES ARE BANNED: never write "像 X / 好比 Y / 可以想象成 Z" anywhere.
  Intuition is carried by the ② interactive demo + 观察要点, not by metaphors.
  If you catch yourself drafting an analogy, delete it and expand the demo's
  观察要点 instead.
- CHECKPOINT: after each concept's six-element block, add
  `<section class="checkpoint">` with 2–3 non-graded self-test questions using
  `<details><summary>` (zero JS, no toggle script). Types: 预测（先预测，再到②
  演示里操作验证）/ 判断+说理由 / 填关键值. Each answer = the answer + one-line
  reasoning + a back-reference (e.g. 见⑤-场景二). Checkpoint questions must map
  to that KP's assertions.
- The 实战演示 must be reproducible (commands/expected output, or full
  derivation).

Quiz rules (NON-NEGOTIABLE) — paste inline:
<paste the floor rules from references/quiz-types.md — all 6 types, ≥1 each,
选择+填空 ≤50%, ≥1 实战, ≥1 综合>

COVERAGE SELF-CHECK (mandatory before returning):
- Every quiz question MUST carry `data-kp` AND `data-assert` (assertion IDs,
  comma-separated, e.g. data-assert="KP-2-A3").
- For each question, verify EVERY assertion ID exists in the chapter's 断言
  清单 AND is substantively taught in that concept's elements. An unlisted or
  thinly-taught assertion = out-of-scope for that question → REWRITE the
  question to test a taught assertion. Catching it here is far better than the
  user discovering it at grading time.
- Include one line in your return summary: "Coverage: all N questions map to
  assertions {KP1-A1, ...}; no out-of-scope items."

VISUALIZATION (default ON — waiver only for pure-recall KPs):
- Every 核心概念 KP gets an interactive demo by default (expect 5–8 per
  chapter). Waive ONLY pure-recall KPs with nothing to operate or observe,
  recording the reason in visualization_decisions — silence is NOT a valid
  waiver. The old "≥2 signals" gate is retired; the signal table is now a
  demo-pattern selector (paste it from references/visualization.md).
- For each demo, generate a STANDALONE interactive HTML file at:
  <abs path to <chapters-dir>/viz/stageN-chXX-<kp-slug>.html>  (viz stays ASCII in the path; localized per naming.md)
  Hard quality bar ("真正的演示", non-negotiable):
  (1) it shows the mechanism ITSELF — the real entities (变量槽/栈帧/堆对象/
      引用箭头/缓存条目) drawn explicitly, state changing visibly per step.
      No metaphor drawings, no static concept charts.
  (2) it covers the KP's key branches INCLUDING at least one ⑤边界条件 case
      (e.g. a pass-by-value demo must include the "对形参重新赋值→实参不变"
      branch), with scenarios mapped to the assertions they verify.
  (3) where feasible the user can change something (scenario select / value
      edit / branch toggle) to test their own predictions.
  (4) vanilla HTML/CSS/JS, all inline, no CDN, 'use strict' + IIFE, 下一步 +
      重置 controls, Chinese labels, render()-from-state pattern, and the
      reportHeight() auto-height snippet kept verbatim.
- In the chapter doc HTML, embed each demo INSIDE the ② 直观演示 slot of that
  concept's `<ol class="elements">` (the skeleton CSS breaks the figure out to
  full card width), followed by a `<ul class="observe">` of 2–3 action items:
  <li><span class="el-label">② 直观演示</span><div class="el-body">
    <figure class="viz">
      <figcaption>🖼️ 交互演示：<机制名></figcaption>
      <iframe src="./viz/stageN-chXX-<kp-slug>.html" loading="lazy" title="<演示名>"></iframe>
      <a class="viz-open" href="./viz/stageN-chXX-<kp-slug>.html" target="_blank">在新标签页打开 ↗</a>
    </figure>
    <ul class="observe">
      <li><点什么：操作哪个控件></li>
      <li><看什么：哪个状态如何变化></li>
      <li><验证哪条断言（KPx·Ay）></li>
    </ul>
  </div></li>
- For waived KPs, the ② slot states 「演示豁免：<理由>」 plus a mechanism-level
  prose walkthrough (no analogy). No empty figure, no placeholder.
- After writing each html file, SELF-VERIFY before returning (the main agent re-verifies):
  (a) extract the <script> content and confirm no syntax errors;
  (b) confirm every getElementById('x') has a matching id="x" in the HTML;
  (c) confirm required elements exist — for the quiz: <form id="quizForm">,
      <button id="submitBtn">, <pre id="answerOutput">, <div id="gradingSummary">,
      and each fieldset has <div class="feedback" id="fb-qN"></div>;
      for viz: the step/reset controls + reportHeight(); for read-mode: titled sections;
  (d) for the quiz: every <fieldset data-qid="qN"> has a form control whose
      name (radio/checkbox) or id (text/textarea) equals "qN".
  (e) skeleton provenance: the chapter doc contains
      `<!-- learning-loop skeleton: read-mode -->` and the quiz contains
      `<!-- learning-loop skeleton: quiz-form -->`. If missing, you copied a
      sibling's stale skeleton — rebuild the skeleton fresh from
      references/templates.md before returning.
  (f) formatting gate: no el-body <p> contains inline enumeration (grep "a)" —
      if found, split into list items); every ⑤边界条件 renders as <ul>.
  (g) viz coverage: every KP has either a viz file embedded in its ② slot or
      an explicit reasoned waiver there.
  (h) checkpoints: every concept has <section class="checkpoint"> with 2–3
      <details> Q&A blocks.
  (i) contamination guard: the HTML must NOT define any "--dsw-*"/"--dsh-*"
      custom properties (consuming them via var(--dsw-alias-*, fallback) is
      required — the theme bridge — but defining them overrides the host
      theme) and must NOT contain "--vscode-" or "icube-theme-variables"
      strings (guards against accidental IDE-CSS paste; a real
      incident in a generated chapter once added ~1900 junk lines).

QUIZ HTML RULES (the quiz is now a form, not md — see references/html-format.md):
- Use the quiz-form html skeleton from references/templates.md verbatim structure.
- Every question is <fieldset class="question" data-qid="qN" data-kp="KP-x"
  data-assert="KP-x-Ay[,KP-x-Az]" data-type="选择|填空|实战|模拟|算法|综合"
  data-points="N">. Every assertion ID in data-assert MUST exist in the
  chapter's 断言清单.
- Radio name="qN" value="A/B/C/D"; checkbox name="qN" value="A/B/C/D";
  text/textarea id="qN".
- Copy the canonical submit JS from references/html-format.md verbatim — do NOT
  rewrite it.
- **FILL the `<script id="quizKey">` tag with the correct answers** (mandatory — this is what the grader reads instead of regex-parsing the HTML). Use the schema from references/html-format.md: for each question, include `qid`/`type`/`kp`/`assert`/`points` + either `answer` (objective types) or `rubric` (subjective types). Every qid must match a `<fieldset data-qid>` 1:1. The quizKey must be valid JSON — before returning, re-read it and verify every bracket, quote, and comma balances (you cannot execute code; check it by careful reading).

Include in your return summary a visualization_decisions block (every KP appears — demo with pattern+branches, or reasoned waiver) and a viz_files_written list per references/visualization.md:
  visualization_decisions:
    KP1: demo — pattern: structure-map (栈/堆/引用箭头) → viz/stageN-chXX-<slug>.html
    KP3: waive — 纯记忆型语法点，无状态流转与可观察行为（②槽内已写豁免说明）
  viz_files_written:
    - path: <abs path>/chapters/viz/stageN-chXX-<kp-slug>.html
      kp: KP1
      pattern: structure-map + stepper
      branches_covered: 改字段生效 / 重赋值无效（对应 KP1-A2, KP1-A3）

Calibration: <adapt difficulty based on baseline_score, target_level, and weak spots — be specific>

Return only: the file paths (chapter doc, quiz, any viz files) and a summary including the coverage line + the visualization_decisions block.
```

After it returns: **three spot-checks before handing to the user.**
1. Coverage: open the chapter doc's 断言清单 and the quiz's `data-assert` tags — fix any mismatch inline (unlisted assertion = rewrite the question).
2. Visualization verification: for EVERY html file returned, run the JS static checks in `references/visualization.md` yourself (syntax check via `node --check` on the extracted script; element-existence; undefined-reference; `__vizHeight` present). A failing demo is NOT shipped — re-dispatch the planner to fix the specific failure, or drop the demo and fill the ② slot with a reasoned waiver. Also verify demo COVERAGE: every KP has an embedded demo or an explicit waiver in its ② slot, and `branches_covered` names at least one ⑤边界条件 case. Do not trust the subagent's self-verify alone; re-run the checks.
3. Formatting gate: grep the chapter doc for inline enumeration in el-body (`a)` inside a `<p>`) and confirm every ⑤边界条件 is a `<ul>`, every concept has a `checkpoint` section, and no `--dsw-*`/`--dsh-*` custom property DEFINITIONS or `--vscode-`/`icube-` CSS junk is present. Fix violations inline or re-dispatch.
Then set `phase: "learn"`, advance `current_chapter`, tell the user the next chapter is ready.

## Job 3: Stage planner (when advancing to a new stage)

**Input to pass:** the topic, all prior stage wikis (so stage N+1 builds on what was actually learned, not just the original plan), `baseline_score`, and the master plan.

**Prompt skeleton:**

```
You are planning the next STAGE of an AI tutoring system.

Context:
- Topic: <topic>, target level: <level>
- Stage <N> just passed. Planning Stage <N+1>.
- Master plan path: <path>  [USE THE read tool ON THIS]
- Prior stage wikis (USE THE read tool ON EACH — stage N+1 must build on
  demonstrated mastery and explicitly reinforce prior weak spots):
  <list paths>

Produce (all HTML — see references/html-format.md):
1. Update <abs path to <plan-dir>/master-plan.html> — fill in stage <N+1>'s chapter (localized per naming.md)
   list if not already detailed (title + objective + type emphasis each).
2. <abs path to <chapters-dir>/stage<N+1>-ch01-<slug>.html> — first chapter doc (read-mode; localized per naming.md)
3. <abs path to <quizzes-dir>/stage<N+1>-ch01-quiz.html> — its quiz (localized per naming.md) (quiz-form)

Templates and quiz floor rules (paste inline):
<paste read-mode HTML skeleton + quiz-form HTML skeleton + quiz floor rules +
the TEACHING DEPTH RULES block from Job 2 — assertion inventory, ② demo slot,
formatting rules, analogy ban, checkpoints — the stage's first chapter follows
the same spec 2.0>

QUIZ HTML RULES (same as Job 2 — the quiz is a form):
- Every question is <fieldset class="question" data-qid="qN" data-kp="KP-x"
  data-assert="KP-x-Ay[,KP-x-Az]" data-type="..." data-points="N">.
- Radio/checkbox name="qN"; text/textarea id="qN".
- Copy the canonical submit JS from references/html-format.md VERBATIM (including
  the empty-skip: `if (el.id && el.value.trim())`). Do NOT rewrite the JS.
- <form id="quizForm">, <button id="submitBtn" type="button">,
  <pre id="answerOutput" style="display:none;">, <div id="gradingSummary" style="display:none;">,
  and each fieldset has <div class="feedback" id="fb-qN"></div>.
- **FILL the `<script id="quizKey">` tag** with the correct answers (same rules as Job 2 above — mandatory, include each question's `assert` field, use the schema from references/html-format.md).

COVERAGE SELF-CHECK (mandatory before returning):
- Every quiz question's data-assert maps to an assertion in the chapter doc's
  断言清单 (data-kp must also match a listed KP).
- Rewrite any question whose assertion isn't taught — do not ship out-of-scope items.
- Include: "Coverage: all N questions map to assertions {list}; no out-of-scope."

SELF-VERIFY each HTML file before returning:
(a) extract <script> and confirm no syntax errors;
(b) every getElementById('x') has matching id="x";
(c) required elements present (quizForm/submitBtn/answerOutput/gradingSummary + each fieldset's fb-qN slot for quiz);
(d) every data-qid="qN" has a control with name/id = "qN";
(e) every KP has a viz embedded in its ② slot or a reasoned waiver there;
    every concept has a checkpoint section; no "--dsw-*"/"--dsh-*" custom property
    definitions and no "--vscode-"/"icube-" CSS junk.

Calibration: this is stage <N+1>, so difficulty steps up. But honor the
weak spots from prior wikis — reinforce before extending.

Return only: paths written + summary including the coverage line + self-verify result.
```

After it returns: **re-verify the HTML yourself** (do not trust the subagent's self-verify alone) — run the JS static checks from `references/html-format.md` on every generated HTML (syntax, element existence, qid↔control matching). Fix any failure inline, or degrade that artifact to md. Only then advance `current_stage`, reset `current_chapter` to 1, set `phase: "learn"`.

## Job 4: Web researcher (mandatory before every stage-total quiz)

**Purpose:** ground the stage-total quiz in real facts from authoritative sources, so its larger volume (≥12 questions) doesn't drift into AI-confident-but-wrong territory.

**Input to pass:** the stage's full scope — all chapter topics + the cumulative weak spots from chapter wikis. The researcher does NOT write the quiz; it returns a brief that the stage-total planner composes into questions.

**Critical tools note:** This subagent needs network access. It must use the DSH web tools `web_search` and `web_fetch`. When dispatching, remind it explicitly: "Use web_search to find official sources, then web_fetch to read them. Do NOT fabricate sources."

**Prompt skeleton:**

```
You are researching authoritative material for a stage-total quiz in an AI tutoring system.

TOOLS: Use the DSH web tools web_search and web_fetch. Every fact you return MUST come with a real URL you actually fetched. Do NOT invent or guess URLs. If you cannot find an authoritative source for a fact, omit it and note the gap.

Context:
- Topic: <topic>, target level: <level>
- Stage <N>: <stage name>
- Chapters in scope (cover each):
  1. <chapter title> — <objective>
  2. ...
- Cumulative weak spots to re-probe (from chapter wikis):
  - <weak spot 1>
  - ...

WHITELIST — fetch ONLY from these (paste the whitelist table from
references/web-research.md inline here). Anything else requires noting
as unverified.

For each chapter's concepts, find:
- Core facts (API signatures, exact defaults, semantic rules) from official docs.
- Real gotchas / common mistakes from the official repo (issues/README) or
  authoritative docs.
- Anything version-sensitive (note the version + recency).

Return EXACTLY this format (the brief the quiz planner will consume):

TOPIC: <stage topic>
REQUESTED SCOPE: <chapters covered>

FINDINGS:
## Concept: <name>
- Fact: <statement> [出处: <url>]
- Fact: <statement> [出处: <url>, <url2>]
- Gotcha: <statement> [出处: <url>]
- Recency: <version/date note, or "unknown">

## Concept: <next>
...

DEGRADATION NOTES:
- <concepts with no whitelist source — mark unverified>
- <if network failed entirely, say so>

sources:
  - url: <url>
    type: official-doc | primary-source-repo | rfc | ...
    accessed: <date>
    recency: <note>
    used_for: <which fact>

AUTHENTICITY RULES (non-negotiable):
- Source gate: whitelist only.
- Corroboration gate: behavioral claims need ≥1 official OR ≥2 independent
  sources (≥1 whitelist).
- If a fetched page contradicts common belief, TRUST THE PAGE. Note the
  contradiction in the brief.
- If network fails or returns nothing for a concept, do NOT substitute AI
  memory — leave that concept out of FINDINGS and note it in DEGRADATION NOTES.

Return only the brief. Do not write any quiz file.
```

**After it returns:**
- If `DEGRADATION NOTES` says full network failure → follow `references/web-research.md` graceful degradation: generate stage-total from AI alone + add the ⚠️ 降级 banner.
- Otherwise → hand the brief to the stage-total generation step (inline the whole brief into that step's context). Compose questions from `FINDINGS`, carry each `[出处]` into the question.

**Do not skip this job for stage-totals.** If you find yourself about to generate a stage-total without a research brief, stop and dispatch the researcher first. The only exception is documented network failure (degradation path).

## Job 5: Curriculum researcher (mandatory before master-plan & new stages)

**Purpose:** pull a canonical learning path from authoritative sources so the master plan reflects how the field is actually taught, not AI's invented structure. This is the fix for "messy plans". Read `references/curriculum-research.md` for the full spec.

**Critical tools note:** needs network access — must use the DSH web tools `web_search` and `web_fetch`. Remind it explicitly: "Use web_search to find official learning paths/roadmaps, then web_fetch to read them. Do NOT fabricate sources or invent a path from memory."

**Input to pass:** the topic, the user's target_level (as a depth hint), and the absolute output directory for the per-chapter cards (the localized sources dir).

**Prompt skeleton:**

```
You are researching the canonical learning path for an AI tutoring system's
master plan. You do NOT write the plan — you return a skeleton + per-chapter
material cards that the planner will adapt.

TOOLS: Use the DSH web tools web_search and web_fetch. Every structural claim (stage/chapter
ordering) MUST come from a real fetched URL. Do NOT invent a path from memory.

Context:
- Topic: <topic>
- Target level hint: <aware|practitioner|expert>  (filters how deep to go)

WHITELIST — fetch the path skeleton from (paste the curriculum whitelist table
from references/curriculum-research.md inline): official learning paths,
official docs TOC, canonical roadmaps (roadmap.sh etc.), authoritative book
TOCs, standard curricula. Avoid blog 学习路线 listicles.

Find ≥2 independent whitelist sources for the topic. Extract the CONSENSUS
structure (where they disagree, note it and prefer the official-doc ordering,
recording why).

Return the skeleton in EXACTLY this format (from curriculum-research.md):

TOPIC: <topic>
TARGET LEVEL HINT: <level>

SOURCES USED (≥2):
- url: <official learning path>
  type: official-learning-path | roadmap | book-toc | official-doc-toc
  accessed: <date>
  what_it_gave: <the spine>
- url: <second source>
  ...

CANONICAL PATH:
Stage 1: <name>  [source: <url>]
  - Chapter: <title> — <objective> [source: <url>]
  - Chapter: ...
Stage 2: <name>  [source: <url>]
  - Chapter: ...
...

PREREQUISITE NOTES:
- <X before Y because...>  [source: <url>]

COMMON GOTCHAS IN TEACHING THIS FIELD:
- <learners struggle with W; teach via V>  [source or consensus]

DEGRADATION NOTES:
- <topics with no whitelist curriculum — flag for AI fill, marked unverified>

ALSO: for EACH chapter in the canonical path, write a per-chapter material card
to <abs path>/<sources-dir>/stageN-chXX.md using this format (paste the card
template from references/curriculum-research.md). These cards let later
chapter-generation draw on authoritative material instead of re-fetching.
Create the localized sources directory if it doesn't exist.

AUTHENTICITY RULES:
- Whitelist only for the skeleton structure.
- If sources disagree sharply, note it and pick official-doc preference.
- If network fails entirely, say so in DEGRADATION NOTES and return an empty
  skeleton (the planner will fall back to AI + banner) — do NOT substitute
  AI memory for a missing external path.

Return only: the skeleton brief + a list of card file paths written + a 3-line
summary (sources used, # stages/# chapters, any degradation).
```

**After it returns:**
- If `DEGRADATION NOTES` says full network failure → follow graceful degradation in `references/curriculum-research.md`: generate plan from AI + add the ⚠️ banner to master-plan.html.
- Otherwise → take the skeleton, apply the allowed-adaptations table to fit the user's baseline/target_level, and write `master-plan.html` (read-mode HTML, with source citations + an adaptations section). The subagent gives you the structure; YOU do the user-specific adaptation (that needs the baseline profile, which the subagent doesn't have).

**Do not skip this job before writing master-plan.html.** If you find yourself about to invent stages/chapters from memory, stop and dispatch the curriculum researcher first. The only exception is documented network failure.

When a chapter passes, the correct order is:

1. (inline) Teach the wrong answers.
2. Dispatch **wiki writer** → wait.
3. Append to `progress.md`, update `meta.json`.
4. Dispatch **next-chapter planner** with the just-written wiki → wait.
5. Tell the user the next chapter is ready.

Steps 2 and 4 are sequential, not parallel — the planner needs the wiki as input. Don't try to batch them.

## What to do if a subagent output is weak

If a returned chapter doc or quiz violates the floor rules (e.g. missing a type, or 选择-heavy), **do not hand it to the user as-is**. Either:
- Re-dispatch with a sharper prompt naming the specific defect, or
- Fix the specific defect inline yourself.

The user never sees a quiz that breaks the six-type rule.
