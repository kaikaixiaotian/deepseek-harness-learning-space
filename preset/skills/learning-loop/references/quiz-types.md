# Quiz Types & Difficulty Ladder

The user explicitly required that **quizzes must not be only 选择 + 填空**. Every quiz (baseline, chapter, plan, stage-total) draws from six question types. This file defines each type and how to mix them dynamically.

## The six types

### 1. 选择题 (Multiple choice)
- **Form**: single or multi-select with options A–D (or more).
- **Tests**: recognition, discrimination between similar concepts.
- **When to lean on it**: checking terminology, basic definitions, "which of these is true".
- **Trap to avoid**: don't let it dominate. Cap at ~25–30% of any quiz's points.

### 2. 填空题 (Fill-in)
- **Form**: a sentence with one or more blanks; user supplies the term/value/formula.
- **Tests**: recall precision (vs. recognition).
- **When to lean on it**: must-know terms, formulas, key parameters.
- **Trap**: keep blanks unambiguous; avoid free-text where many answers are defensible.

### 3. 实战题 (Practical task)
- **Form**: a concrete task with given input/context and a clear expected output — write code, produce a config, transform data, debug a snippet, execute a procedure.
- **Tests**: can the user *do* the thing, not just describe it.
- **Grading**: rubric-based (partial credit). Define what "full", "partial", "minimal" look like in the AI-grading section.
- **Must appear** in every chapter quiz and the plan-quiz. This is the type most worth doing.

### 4. 模拟题 (Scenario roleplay)
- **Form**: "假设你是 X，面对情况 Y，你会如何决策/回应？" The user inhabits a role and reasons under constraints.
- **Tests**: judgment, prioritization, applying concepts to messy reality.
- **Grading**: judge the *reasoning* and *trade-off awareness*, not one right answer. A defensible choice with sound reasoning passes; a lucky guess without reasoning does not.
- **Especially valuable** in plan-quizzes and stage-totals — it's the hardest to pass by memorization.

### 5. 算法 / 推导题 (Derive / design)
- **Form**: derive a result from first principles, design an algorithm/flow/architecture, prove why something works, or optimize a given solution.
- **Tests**: first-principles understanding vs. pattern-matching.
- **Grading**: steps matter. A correct final answer with broken derivation is partial credit.
- **Include at least one** in every plan-quiz and stage-total.

### 6. 高难度综合题 (Synthesis / stretch)
- **Form**: cross-chapter, open-ended, multi-step. "Given A and B and constraint C, design a complete solution and justify the trade-offs." Often has no single right answer.
- **Tests**: integration, transfer, the ceiling of the user's grasp.
- **Grading**: depth of reasoning, identification of trade-offs, correctness of the parts they commit to. Partial is normal and expected.
- **Include 1** in chapter quizzes, 1–2 in plan-quizzes, 2–3 in stage-totals.

## Dynamic mixing (动态适配)

There is no fixed quota — adapt the mix to three signals:

1. **Chapter nature.** A concept-heavy chapter (definitions, taxonomy) leans more on 选择/填空 + one 模拟. A skill chapter (writing code, running a procedure) leans heavily on 实战 + 算法. A capstone chapter leans on 综合.
2. **User level (from `baseline_score` and accumulated wiki).** High level → more 模拟/算法/综合, fewer recognition items. Low level → more 选择/填空 to build a firm base, but **still at least one 实战 and one 综合** — never collapse to recognition-only.
3. **Past weak spots.** If the chapter wiki says the user struggled with X, the *next* quiz's 实战/综合 should re-probe X from a new angle.

### Floor rules (non-negotiable)

Regardless of adaptation, every quiz must satisfy:

- At least **1 question of each of the 6 types** (so a chapter quiz has ≥6 questions).
- 选择 + 填空 combined ≤ **50% of total points**. The other half must be 实战/模拟/算法/综合.
- At least **1 实战** and **1 综合** in every chapter quiz and plan-quiz.
- Plan-quiz and stage-total must include **at least 1 算法/推导**.

If you find yourself generating a quiz that's mostly 选择/填空, stop and rewrite — you've drifted from what the user asked for.

## Difficulty ladder within a type

Inside any single quiz, order questions easy → hard within each type, and weight points accordingly (e.g. 选择 1pt, 填空 1–2pt, 实战 3–5pt, 综合 5–8pt). State the point value next to each question so grading is transparent.

**Point-notation format is fixed** — use it for EVERY question so points can be summed reliably by both humans and tooling:

```
3. (实战题, 4分) …
```

Rules for the notation:
- Half-width parentheses `(` `)` and half-width comma `,` — NOT full-width `（`，`）`. Mixed-width brackets break automated point-summing.
- Format exactly `(题型, X分)` where 题型 is one of: 选择题 / 填空题 / 实战题 / 模拟题 / 算法题 / 综合题. (算法/推导 → 算法题; 高难度综合 → 综合题, for matching.)
- Place it immediately after the question number, before the question text.
- Multi-select questions add 多选 inside: `(选择题[多选], 2分)`.

Every question in every quiz uses this exact notation. A quiz with any unmarked question is not finished — regenerate or fix before handing to the user.

## Plan-quiz specifically

The plan-quiz is **live** (asked in chat, one at a time) and must use **different** questions from the chapter quiz — new scenarios, edge cases, cross-concept links. Its purpose is transfer, not recall. Recommended mix for a plan-quiz of ~6 questions:

- 0–1 选择（lean away from recognition here）
- 0–1 填空
- 1–2 实战
- 1 模拟
- 1 算法/推导
- 1 高难度综合

Ask one question, wait for the answer, then the next. After the last, score and combine with the chapter quiz for the pass/fail gate.

## Stage-total specifically

Covers all chapters in the stage. Scale: roughly 2–3 questions per chapter across types, so a 4-chapter stage yields ~10–14 questions. Must include ≥2 综合 that span multiple chapters. Same ≥0.80 gate.
