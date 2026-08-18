# Curriculum Research Protocol

The master plan (总目录) is the single most important artifact in the loop — every chapter flows from it. Generating it from AI memory alone produces plans that miss canonical topics, order concepts against the field's real learning curve, or invent a structure no practitioner would recognize. This file defines how to **pull a real learning path from authoritative sources first**, then let AI adapt it to the user's baseline. Read this before any master-plan generation (initial or new-stage).

> **DSH dispatch note**: dispatch this research as a `subagent` whose prompt instructs it to use the DSH `web_search` tool (and the web tool's `fetch` to read page bodies from whitelist URLs). The subagent inherits the session's tools and writes the per-chapter material cards itself.

This is distinct from `references/web-research.md`: that file is about grounding *quiz questions* in facts (per-stage-total). This file is about grounding the *curriculum structure itself* (the whole stage/chapter roadmap) in how the field is actually taught.

## Why curriculum research, not AI invention

The user explicitly flagged that current plans are "a bit messy" — because AI invents the stage axis and chapter list from memory. Real fields have *canonical* learning paths refined over years by educators and maintainers: official docs have a "Getting Started → Tutorial → Core Concepts → Advanced" spine; canonical books have battle-tested chapter orders; well-known roadmaps (roadmap.sh, official learning paths) lay out prerequisites and progression. Pulling these gives a **skeleton that practitioners recognize**, which AI then adapts to the user's level. AI is the adapter, not the architect.

## Whitelist of curriculum sources

Use these for the path skeleton. Same authenticity discipline as `web-research.md` — record URLs, prefer official.

| Category | Examples | Why trustworthy |
|----------|----------|-----------------|
| **Official learning paths** | react.dev/learn, vuejs.org/tutorial, go.dev/doc/tutorial, kubernetes.io/docs/tutorials, docs.python.org/3/tutorial/index.html | Maintainer-curated progression |
| **Official "Getting Started" + TOC** | The official docs' table of contents / sidebar structure | Reveals the canonical concept ordering |
| **Canonical roadmaps** | roadmap.sh/* (e.g. frontend, backend, devops), official "learning path" pages | Community/maintainer vetted prerequisite graphs |
| **Authoritative book TOCs** | "Designing Data-Intensive Applications", "Structure and Interpretation", official certification study guides | Years of teaching refinement baked into chapter order |
| **Standard curricula** | ACM/IEEE curriculum recommendations, university course sequences for theory topics (algorithms, OS, networks) | Pedagogically validated |
| **For Chinese-context topics** | Official docs' Chinese version if exists (e.g. zh.react.dev); otherwise stick to the English official source and translate structure | Matches user's language without losing authority |

**Avoid for the skeleton**: random blog "学习路线" posts, Zhihu/掘金 listicles, video course outlines with no transcript — same exclusion logic as `web-research.md`. These may *inspire* but cannot anchor the structure.

## What to extract — the skeleton brief

The curriculum-research subagent returns a **structured skeleton**, NOT prose. This is what the planner adapts into `master-plan.html`. Format:

```
TOPIC: <topic>, e.g. "React"
TARGET LEVEL HINT: <aware|practitioner|expert>  (the user's level, for the subagent to filter depth)

SOURCES USED (≥2, whitelist):
- url: <official learning path>
  type: official-learning-path
  accessed: <date>
  what_it_gave: <the spine of the plan>
- url: <second source — a roadmap or book TOC>
  type: roadmap | book-toc | official-doc-toc
  accessed: <date>
  what_it_gave: <cross-check / fill gaps>

CANONICAL PATH (the consensus structure from sources):

Stage 1: <name, e.g. "基础与核心概念">  [source: which URL this stage came from]
  - Chapter: <title> — <objective> [source: url]
  - Chapter: <title> — <objective> [source: url]
  ...
Stage 2: <name, e.g. "状态与交互">  [source: url]
  - Chapter: ...
Stage 3: ...

PREREQUISITE NOTES:
- <X should come before Y because...>  [source: url]
- <Z is commonly skipped by beginners; flag for practitioner level>

COMMON GOTCHAS IN TEACHING THIS FIELD:
- <learners consistently struggle with W; teach it via V>  [source: url or consensus note]

DEGRADATION NOTES:
- <concepts where no whitelist curriculum was found — flag for AI to fill from domain knowledge, marked unverified>
```

The skeleton is the **consensus** across the sources — where they disagree on ordering, the subagent notes the disagreement and picks the majority/official-doc preference, recording why.

## Per-chapter material (the user's confirmed "路径 + 各章资料" choice)

Beyond the skeleton, the subagent ALSO pulls a one-paragraph reference summary for each chapter's topic, so later chapter-generation has authoritative material to draw on (not just a title). This lives in `plan/sources/stageN-chXX.md`:

```markdown
# 章节资料卡 — 阶段< N >·章节< XX > <title>

> 来源：<url> (official-doc) · 抓取于 <date>
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

These cards are written to disk during initialization so chapter-generation subagents can `Read` them instead of re-fetching (and so the stage-total web-researcher can build on them rather than start fresh).

## How AI adapts the skeleton (not invents it)

The planner receives the skeleton + the user's baseline profile + target_level, and **adapts** — never discards the external structure. Allowed adaptations (all must be recorded as deviations with reasons):

| Adaptation | When allowed | Must record |
|------------|--------------|-------------|
| **Merge/split chapters** | A canonical chapter is too big/small for the user's level (e.g. split "Hooks" into two for a low-baseline user) | Which source chapter was split/merged + why |
| **Reorder** | Only if prerequisite logic demands it (never for taste) | The prerequisite reason |
| **Add a remedial chapter** | Baseline reveals a gap the canonical path assumes (e.g. user lacks JS basics before React) | Marked clearly as "补强: not in canonical path" |
| **Drop/skip** | target_level=aware allows skipping the deepest advanced chapter | Which chapter + that user level permits it |
| **Adjust depth emphasis** | Always | Which question types each chapter leans on |

**Forbidden**: inventing a stage axis that contradicts the sources (e.g. sources say "foundations → components → state → advanced"; AI must not reorder to "hooks first → components later" on a whim). If AI genuinely believes the canonical order is wrong, it must cite *why* with a concrete pedagogical reason, and flag the deviation prominently in `master-plan.html` for the user to question.

## Graceful degradation (same philosophy as web-research.md)

| Failure | Action |
|---------|--------|
| Network unreachable | Fall back to AI-generated plan. Add banner to `master-plan.html`: `> ⚠️ 本计划未经外部学习路径验证（网络不可达）。结构与该领域公认学习曲线可能不符。` |
| Whitelist has no curriculum for the topic (rare/niche) | Use AI plan but mark each stage with `[AI推断: 未经外部验证]` so the user knows what's grounded and what isn't. |
| Partial — some chapters sourced, some not | Per-chapter: sourced chapters carry `[出处: url]` in master-plan; unsourced carry `[AI推断]`. |
| Sources disagree sharply | Note the disagreement in master-plan's notes section; pick the official-doc preference; tell the user there's a known alternative ordering. |

Never silently substitute AI memory for a missing external path. The banner/tags are mandatory so the user knows how much to trust the plan.

## Where this plugs in

- **Initial master-plan generation** (after baseline grading): MANDATORY. This is the fix for the "messy plan" problem.
- **New-stage planning** (advancing stages): MANDATORY for that stage's chapter list — the stage-planner subagent must pull the canonical structure for the stage's sub-topic before listing chapters.
- **Chapter rebuild (v2/v3)**: NOT needed here — rebuilds are about re-explaining a known concept, not re-planning the path.
- **Chapter generation**: Uses the per-chapter material cards (already fetched at init), doesn't re-run curriculum research.

## Sequencing with the existing loop

Initialization order becomes:
1. Baseline assessment → user fills → grade → profile.
2. **NEW: dispatch curriculum-research subagent** (skeleton + per-chapter cards). Wait.
3. AI adapts skeleton to baseline → writes `master-plan.html` (with source citations + adaptation notes).
4. Build stage 1 chapter 1 (now grounded by the per-chapter card + six-element structure + viz judgment).
5. Proceed as before.

The only structural change is step 2 inserted and step 3 redefined from "invent" to "adapt". Everything downstream (chapter generation, coverage check, stage-total web-research) stays the same — but now builds on a grounded plan instead of an invented one.
