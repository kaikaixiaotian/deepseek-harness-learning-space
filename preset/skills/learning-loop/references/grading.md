# Grading Rubric

Grading has two hard parts: **subjective question types** (实战/模拟/算法/综合) can't be marked right/wrong like 选择填空, and the **combined pass/fail score** blends two quizzes with different characters. This file makes both deterministic so the same answers grade the same way every time.

Read this before grading any chapter quiz, plan-quiz, or stage-total.

## Per-type scoring

Every question carries an explicit point value stated in the quiz (see `quiz-types.md`). Grade within that budget.

### 选择题 (objective — binary)
- Correct selection → full points.
- Wrong / blank → 0.
- Multi-select: full points only if every selected option is correct AND every correct option is selected. No partial on multi-select unless the question explicitly says "选对得 1 分，选错扣 ..." — if it does, follow that.

### 填空题 (objective — binary or near-binary)
- Exact match (or clearly-equivalent term/formula) → full points.
- Synonym that's unambiguously the same concept → full points. When in doubt, accept.
- Wrong / blank → 0.
- Multi-blank: proportional (e.g. 2 blanks correct out of 3 → 2/3 of points).

### 实战题 (subjective — rubric, partial credit)
Grade on three dimensions, each a fraction of the question's points:

| Dimension | What it checks | Weight |
|-----------|----------------|--------|
| 正确性 | Does the output match the expected result? End state right? | ~50% |
| 过程 | Are the steps/method sound? Even if a detail is off, is the approach right? | ~35% |
| 边界/严谨 | Did they handle edge cases, invalid input, units, error paths? | ~15% |

Map to a score:
- All three solid → full.
- Right answer, weak process (guessed/lucked) → ~50%.
- Right process, wrong final detail → ~70%.
- Wrong approach → ≤30% even if a number happens to match.

Write the per-dimension verdict in the AI-grading table so the user sees *why*.

### 模拟题 (subjective — reasoning-based, not answer-based)
There is often no single right answer. Grade on:

| Dimension | What it checks |
|-----------|----------------|
| 判断合理性 | Is the chosen action defensible given the scenario constraints? |
| 取舍意识 | Did they name what they're trading off and why? |
| 论证质量 | Is the reasoning sound, or is it a lucky guess without justification? |

Scoring:
- Defensible choice + sound reasoning + aware of trade-off → full.
- Defensible choice but thin/missing reasoning → ~60%. (A right answer you can't justify doesn't transfer.)
- Lucky guess with no reasoning → ≤30%.
- Undefensible choice → 0, even if articulated confidently.

This type is the hardest to pass by memorization — hold the reasoning bar.

### 算法/推导题 (subjective — steps matter)
- Final answer correct AND derivation sound → full.
- Final answer correct but derivation has gaps/errors → ~60%.
- Derivation sound but final answer wrong due to arithmetic/copy error → ~75%.
- Wrong approach from the start → ≤30%.
- Partial: grade each derivation step; sum earned steps / total steps × points.

### 高难度综合题 (subjective — partial is normal)
Open-ended, multi-step, often cross-chapter. Grade by **components committed correctly**, not by one final verdict:

- Identify the sub-problems the question decomposes into (usually 3–5).
- Each correctly-handled sub-problem → its share of points.
- Bonus weight for: identifying the right trade-off, naming an assumption, choosing a justified approach under ambiguity.
- A half-finished solution that's correct on the parts it attempts beats a fully-written wrong one.
- Explicitly reward "I would need to check X" honesty over confident wrong answers.

It's normal for the average user to score 50–70% on 综合. That's the design — it's the ceiling probe.

## Recording grades

**Answer source**: quiz answers now come from the user's downloaded `*-answers.json` (produced by the HTML quiz form — see `references/html-format.md`), NOT from parsing filled markdown. The json is a clean `{quiz, submitted_at, answers: {q1: "B", q2: ["A","C"], q3: "text..."}}` object — read `answers.qN` per question.

**Correct answers source (HOW TO GRADE — critical):** read the `<script id="quizKey">` tag from the quiz HTML. Read it as structured JSON to get the per-question correct answers (check the JSON syntax by careful reading — bracket/quote/comma balance; you cannot execute code). **Never regex-parse the quiz HTML to find correct answers** — that's fragile and the root cause of grading failures. The quizKey JSON has `questions[].qid/type/kp/assert/points` + `answer` (objective) or `rubric` (subjective). For each qN: look up `questions[i].qid === qN`, compare `userAnswer[qN]` against `questions[i].answer` (objective) or evaluate against `questions[i].rubric` dimensions (subjective). The KP AND assertion for the coverage check also come from quizKey (not from scraping data-kp/data-assert attributes).

**Two input modes** (handle both):
- **File mode (preferred):** Read the `*-answers.json` at the user-given path. If Read fails (file not found), do NOT grade — tell the user and wait (see SKILL.md "How submit a quiz works").
- **Paste mode (fallback):** the user pastes the JSON text into chat. Read it as JSON first (verify bracket/quote/comma balance by careful reading). On a clear syntax problem, ask them to re-paste or use the file handoff — do not attempt to grade malformed JSON.

**Unanswered handling (uniform):** "unanswered" = the question's key is MISSING from `answers` (the submit JS skips empty text and unchecked groups, so all unanswered questions are uniformly missing keys). If you encounter a `""` or `null` from an older JS version, treat those as unanswered too. Completeness gate: before grading, check every expected `qN` is present with a non-empty value; if any is missing/empty, tell the user which and wait — do not grade incomplete.

**Degraded-to-md quizzes (rare):** if a quiz fell back to markdown (HTML failed verification repeatedly), the answers come from the filled md's `**你的答案：**` fields instead of json, KP tags are the inline `[考点: KP-x]` md tags (not `data-kp`), and the grading write-back goes into the md's `*AI 批阅区*` table (not the HTML `gradingArea`). The rubric below is format-agnostic — only the input/output mechanism differs.

For every graded quiz, produce the grading in **two places** (both mandatory):
1. **`*-grading.json`** (next to answers.json) — structured per-question record for AI resume:
   ```json
   { "quiz": "...", "graded_at": "...",
     "per_question": [
       {"qid":"q1","type":"选择","kp":"KP-2","correct":true,"scored":true,"loss":""},
       {"qid":"q4","type":"实战","kp":"KP-3","correct":false,"scored":true,"loss":"正确性✓ 过程✗ 边界✗"}
     ],
     "score": 0.70, "out_of_scope_count": 0, "verdict": "pending-combine" }
   ```
2. **The quiz HTML — per-question inline feedback.** Each question's `<fieldset>` has a `<div class="feedback" id="fb-qN">` slot. Fill each slot with that question's verdict so the user sees the annotation **directly under the question** on refresh (NOT a separate bottom table — that was the old design). For each qN, Edit `<div class="feedback" id="fb-qN"></div>` → a block with class `feedback shown <verdict>` (verdict = correct/wrong/partial/out-of-scope) containing `<span class="verdict">✓正确/✗错误/△部分/超纲</span>` + 考点/题型/分值 + 失分点. Then Edit `<div id="gradingSummary" style="display:none;"></div>` → the summary line `章节测验得分：0.XX（X/Y 分）`. Exact Edit recipe + post-edit verification in `references/html-format.md`. The user reopens the HTML and each question shows its own verdict inline.

Each subjective question's 失分点 must carry: the concept missed in plain language + the dimension that cost points (for 实战/模拟/算法/综合).

## Out-of-scope (超纲) questions — do not penalize the user

This is a critical fairness rule. The chapter doc has a **知识点清单 + 考点断言 (assertion inventory)** that defines the testable scope. A question whose 考点 maps to no listed assertion is **out-of-scope (超纲)** — the user was never taught that material, so failing it is the *course's* fault, not the user's. Grading it normally would punish the user for content they had no way to learn, which is exactly the trap that makes loops feel unfair and causes spurious failures.

**Detection (do this for every question while grading — assertion-level, with KP-level fallback):**
1. **Assertion level (spec 2.0 quizzes):** read the question's `assert` from quizKey (or the `data-assert` attribute on its `<fieldset>`, e.g. `KP-6-A3`). Open the chapter doc's 断言清单 (the `kp-asserts` list in the KP callout) and verify every listed assertion ID exists there. A question testing an unlisted assertion (or one only thinly taught — e.g. an ⑤边界条件 case never actually broken out) is 超纲, even if its KP is listed. Assertion-level matching catches the "KP taught in one sentence but tested at application depth" loophole that KP-level matching misses.
2. **KP level (fallback for older quizzes without `assert`):** read the question's KP from quizKey or the `data-kp` attribute, and verify that KP exists AND that the specific concept probed is substantively covered in that KP's 核心概念 section.
3. If the assertion/KP is missing or not covered → mark the row's 计分？column as **超纲**.

**Scoring treatment for 超纲 questions:**
- **Excluded from both numerator and denominator.** A 10-point quiz with one 2-point 超纲 question is scored out of 8, not 10. The user's 超纲 answer (right or wrong) does not move the score.
- Mark the row 计分？= 超纲, fill 正确？= — (ungraded).
- The summary line becomes: `章节测验得分：0.XX（X/Y 分，Y 已剔除 N 道超纲题）`.

**Recovery (补讲补考) — mandatory when 超纲 is found:**
This is the fix, not just the excuse. When ANY 超纲 question is detected:
1. **Tell the user explicitly** at grading time: "第 X 题考点（<concept>）本章未讲解，已判定为超纲不计分。"
2. **补讲 (re-teach):** append the missing concept to the chapter doc as a **补讲 section** so it is navigable, not buried. Place it under `<h2 id="sec-backfill">补讲</h2>` (after 核心概念, before 实战演示); each补讲 is `<h3 id="backfill-<slug>">title <span class="backfill-badge">补讲</span></h3>` + `<p class="backfill-meta">KP·日期·来源</p>` (e.g. `KP6 补充 · 2026-08-13 阶段总测验超纲补讲`) + the six-element `<ol class="elements">` (same structure as core concepts; ②直观演示 may be waived in a 补讲 with a stated reason) + 1–2 checkpoint questions. **AND append the newly-taught assertions to the KP callout's `kp-asserts` list** — the replacement question must have an in-scope assertion to target. **Also add a quick-jump entry** for it in the left `<aside class="toc">`: a `<p class="toc-sub">补讲</p>` group after 小结自查, with `<a href="#backfill-<slug>">title</a>` per补讲. Skeleton + CSS in `references/templates.md`. If you have web research available, ground it; otherwise teach from first principles. (If a rebuild is already in progress, you may instead note it for the next version.)
3. **补考 (re-test):** generate ONE replacement question of the **same type and point value**, testing the newly-taught concept (now in-scope). Ask it — for a chapter-quiz replacement, append to the live plan-quiz round; for a plan-quiz replacement, ask it inline right after the补讲.
4. The replacement question IS counted normally. The user is never left with a knowledge gap just because the original quiz drifted out of scope.

**Why this matters:** without this rule, a chapter that under-teaches will systematically fail users on questions about material they never saw. That's not a learning loop, that's a rigged test. The 超纲 rule makes the course honest about what it actually taught.

## Combined pass/fail score

The pass gate blends the chapter quiz (from `*-answers.json`) and the plan-quiz (live). They measure different things, so weight them:

```
combined = 0.45 × chapter_quiz + 0.55 × plan_quiz
```

Both scores in the formula are computed **after** excluding 超纲 questions (i.e. each is X / Y where Y omits out-of-scope items). Rationale: the plan-quiz is the transfer check — it's deliberately different from the chapter quiz and a better signal of mastery, so it weighs slightly more. But the chapter quiz still matters (it's the broader coverage), so it's not drowned out.

- **combined ≥ 0.80 → pass.**
- combined < 0.80 → rebuild flow (see failure handling below).

For **stage-total**: it's a single quiz, no blending. Pass at ≥ 0.80 of its own score.

For **baseline**: not pass/fail. Just record `baseline_score = points_earned / points_possible`.

## Failure handling — the rebuild loop

When combined < 0.80, the chapter goes into rebuild. To avoid an infinite loop:

1. **Max attempts: 3** per chapter (v1 → v2 → v3). Track `attempts` in `meta.json`.
2. On each rebuild, the new doc/quiz must change *approach*, not just wording:
   - v2: re-teach weak concepts with a different angle, more worked examples, simpler scaffolding. Quiz focuses on the specific failure points.
   - v3: if v2 also failed, the issue is likely prerequisite-level. v3 inserts a **bridge section** at the top that re-teaches the prerequisite the user is actually missing, then re-attempts the chapter. Quiz includes 1–2 prerequisite-check questions.
3. **After v3 fails** (3rd attempt, still < 0.80): stop rebuilding. Tell the user honestly that this chapter needs more than the loop can provide right now, summarize exactly what's blocking them, and offer options:
   - Pause and let them study external material, then retry from v1.
   - Simplify the target level for this chapter (skip the hardest 综合, accept a narrower pass).
   - Drop to a prerequisite chapter that fills the gap first.

Do NOT silently generate v4. The loop's credibility depends on knowing when to stop.

## What "correctness" means when you're the grader

You are both author and grader of these questions, which risks leniency bias (you wrote the "expected" answer, so you tend to accept things close to it). Counter it:

- For subjective types, grade the **reasoning**, not similarity to your own phrasing. A user who reaches the right conclusion via different (but valid) reasoning gets full marks.
- If a user gives an answer you didn't anticipate but that holds up under scrutiny, mark it correct and note it in the wiki — that's a signal the question was under-specified.
- When uncertain between two scores, pick the lower and explain what was missing — false positives (passing someone who didn't earn it) erode the loop faster than false negatives.
