---
name: learning-loop
description: Guide a user through AI-assisted mastery of any skill or domain via a structured, self-paced closed-loop learning system. Use whenever the user wants to learn, study, be taught, or get trained on a topic — including phrases like "教我学习 X"、"我想学 X"、"帮我掌握 X"、"学习计划"、"训练我"、"带我学"、"tutor me on X"、"I want to learn X". Triggers on first run (initializes a plan) AND on every subsequent run (auto-resumes from saved progress). Also use when the user submits a quiz (answers.json downloaded from an HTML quiz form) and expects grading + next steps. Also use when the user asks to upgrade or update the learning-loop skill itself — "/learning-loop upgrade" or 升级/更新 learning-loop.
whenToUse: 当用户想学习、研究、被教授或被训练某个主题（"我想学 X"、"教我 X"、学习计划等），或提交测验答案期待批改，或请求升级该技能时使用。
---

# Learning Loop

You run a **closed-loop learning system**: the AI teaches, the user proves mastery, the AI adapts. Every chapter ends in a measurable pass/fail gate, and failure rebuilds the material rather than moving on. This is the discipline that makes the loop actually teach instead of just generate content.

## Read these references on demand

- `references/naming.md` — the locale-aware directory/file naming table (en/zh). Read before generating ANY file, so every path matches the workspace's `meta.json.locale`. `meta.json` is always `meta.json`; topic slugs stay ASCII.
- `references/templates.md` — content structure for every file the system produces (baseline, plan, chapter, quizzes, wiki) + the HTML skeletons (read-mode + quiz-form). Chapter docs follow spec 2.0: assertion inventory (考点断言), six elements with ② 直观演示 (embedded interactive demo), per-concept checkpoints, anti-wall-of-text formatting rules. Read before generating any user-facing file. Markdown templates within are the degradation fallback; default output is HTML per `references/html-format.md`.
- `references/quiz-types.md` — the six required question types and the difficulty ladder. Read before generating any quiz so the question mix is correct.
- `references/grading.md` — per-type rubrics, combined-score weights, and the failure-loop cap. Read before grading any quiz or running a rebuild.
- `references/subagent-protocol.md` — how to dispatch subagents for chapter planning, wiki building, re-planning, and web research. Read before any subagent call.
- `references/wiki-schema.md` — the wiki record schema. Read before writing or updating a wiki file.
- `references/web-research.md` — whitelist of authoritative sources, authenticity gates, graceful degradation, citation format. Read before any web-research subagent dispatch and before generating any stage-total quiz.
- `references/visualization.md` — demos are the primary intuition vehicle (analogies are banned): default-on per-KP rule with narrow waivers, the "真正的演示" quality bar (mechanism itself, boundary-case branch coverage, user-operable), and the JS static-verification flow. Read before any chapter generation.
- `references/curriculum-research.md` — how to pull a canonical learning path from authoritative sources and adapt it to the user's baseline, instead of inventing the plan from AI memory. Read before any master-plan or new-stage generation.
- `references/html-format.md` — all user-facing files are HTML (read-mode + quiz-form), the answers.json submission mechanism, and JS verification. Read before generating any chapter doc, master plan, or quiz.
- `references/upgrade.md` — the full upgrade protocol: **update the skill itself from GitHub first** (`git pull --ff-only` in the preset install dir), then mark existing workspaces so subsequent generation follows the current spec (existing files left untouched). Read when the user runs `/learning-loop upgrade` or asks to 升级/更新 the learning-loop skill.

## The loop at a glance

```
[init] describe topic → ask baseline questions → user fills baseline.html form → submits answers.json → upload
   ↓
[plan] build master plan (stages auto-tiered) + stage-1 chapters + chapter-1 doc + chapter-1 quiz
   ↓
[learn] user studies chapter doc (.html) → fills chapter-quiz.html form → submits answers.json → uploads
   ↓
[plan-quiz] ask ADDITIONAL questions not in the chapter quiz (verifies transfer)
   ↓
                 ┌── ≥80% correct → analyze wrong answers → build chapter wiki (subagent) → next chapter (subagent)
   grade ────────┤
                 └── <80% correct → rebuild chapter doc as <name>_v2.html + matching quiz.html → user re-studies
   ↓
[stage end] last chapter passed → ask "next stage?" → yes: stage total quiz → repeat; no: done
```

The whole system is a **state machine**. Persist its state in `meta.json` (schema below) so any future invocation can resume.

## First run vs. resume

On every invocation, the **first action** is to look for existing learning workspaces in the current directory — folders whose name ends with one of the workspace suffixes in `references/naming.md` (e.g. `-learning` / `-学习`) and that contain a `meta.json`.

- **None found** → first run; go to the Initialization flow.
- **Exactly one found** → read its `meta.json` + `wiki/progress.md`, tell the user where they left off (stage/chapter/phase in one line), and offer to continue. Do NOT re-initialize. (User chose auto-resume.)
- **Multiple found** → list them by topic with a one-line status each, and ask the user which to resume. Do not guess. This handles the "学完 React 再学 Python" case where two workspaces coexist.
- **Found, but the user names a *different* topic** → they want a new workspace. Confirm, then go to Initialization. Never silently resume a different-topic workspace just because it exists.

## Command branches (`/learning-loop`)

DSH auto-derives the `/learning-loop` slash command from this skill (user-invocable skills are exposed as `/name`). The trailing argument selects a branch:

| Input | Behavior |
|---|---|
| `/learning-loop` (empty) | "First run vs. resume" — detect workspaces, resume or ask topic. |
| `/learning-loop <topic>` | Skip the topic question; initialize directly with `<topic>` (still asks target level). |
| `/learning-loop status` | Read-only: list every workspace's topic / stage / chapter / phase / last score; change nothing and do not enter the loop. |
| `/learning-loop upgrade` | Maintenance: pull latest skill + migrate workspaces — see "Upgrade requests" and `references/upgrade.md`. |

## Upgrade requests (skill update — not the learning flow)

When the user's message is about upgrading **the skill itself** — `learning-loop upgrade`, `/learning-loop upgrade`, 升级/更新 learning-loop — do NOT route through First-run/resume and do NOT treat it as a workspace-only migration. This is a maintenance request; without pulling the latest skill files first, the "current spec" isn't actually installed. Read `references/upgrade.md` and follow it end-to-end:

1. **Update the skill itself** (mandatory, first): `git pull --ff-only` in the preset install dir `$DSH_HOME/.agent-presets/learning/` (the skill lives in its `skills/learning-loop/` subdirectory; re-clone if it's not a git install; on pull failure report the error and stop — never force). The `/learning-loop` command is auto-derived from the skill, so there is no separate command file to sync.
2. **Migrate workspaces**: stamp each workspace `meta.json` (any localized name) with `schema_version` (the new skill version) + `upgraded_at` + a history event. Existing files are never touched.
3. **Report** old → new version, workspaces migrated, and remind the user to start a fresh session to load the updated skill.

Do not enter the learning loop during upgrade; the user runs `/learning-loop` separately to continue learning.

## Directory layout

Create one workspace per learning topic, in a subfolder of the current working directory, named `<topic-slug>-<suffix>/` where `<suffix>` is the localized workspace suffix from `references/naming.md` (`-learning` in English, `-学习` in Chinese; e.g. `machine-learning-learning/` or `react-学习/`). The topic slug stays ASCII. **Every directory and file name below is localized per `references/naming.md`**; the tree shows the English form and the Chinese form comes from the same table (e.g. `00-baseline` → `00-基线测评`, `plan` → `计划`, `chapters` → `章节`, `quizzes` → `测验`, `wiki` → `知识库`, `viz` → `演示`, `master-plan.html` → `总目录.html`). `meta.json` is always `meta.json`. This keeps learning material scoped to the project, not the user's home dir.

```
<topic>-learning/
├── meta.json                       # state machine — the single source of truth
├── 00-baseline/
│   └── baseline.html               # quiz-form: AI-authored questions, user fills via form
├── plan/
│   ├── master-plan.html            # 总目录: all stages + chapters (read-mode)
│   ├── master-plan-grading.json    # (after baseline) AI's adapted-plan record
│   └── sources/stageN-chXX.md      # per-chapter material cards (internal AI use, md)
├── chapters/
│   ├── stage1-ch01-<slug>.html     # chapter doc (read-mode); rebuilt versions get _v2, _v3
│   └── viz/stage1-ch01-<kp>.html   # interactive visualizations (unchanged)
├── quizzes/
│   ├── baseline.html               # = 00-baseline/baseline.html (symlink or copy)
│   ├── stage1-ch01-quiz.html       # chapter quiz (quiz-form)
│   ├── stage1-ch01-quiz-answers.json     # user submission (downloaded from the form)
│   ├── stage1-ch01-quiz-grading.json     # AI grading record
│   ├── stage1-ch01-plan-quiz.md    # transfer check receipt (STILL md — live chat, AI writes post-hoc)
│   └── stage1-total-quiz.html      # stage-level comprehensive quiz (quiz-form)
├── wiki/
│   ├── progress.md                 # master progress log (internal AI use, md)
│   └── stage1-ch01-wiki.md         # per-chapter learning record (internal AI use, md)
├── notes/
│   └── stage1-ch01-<slug>-note.html  # per-chapter rich-text notes — owned by the learning-space UI, never written by the AI
```

**User-facing files are HTML** (chapter docs, master plan, all three quizzes) — see `references/html-format.md`. **Internal AI-only files stay markdown/json** (meta.json, wiki, plan/sources, plan-quiz receipt). The plan-quiz is the ONE exception to HTML — it stays live-chat + md receipt (user explicitly requested it unchanged).

## meta.json — the state machine

This file is the contract between invocations. Update it after every state transition.

```json
{
  "topic": "machine learning",
  "topic_slug": "machine-learning",
  "locale": "zh",               // "zh" | "en" — chosen at init from the user's language; drives ALL generated dir/file names via references/naming.md
  "target_level": "practitioner",  // aware | practitioner | expert — drives plan depth
  "created_at": "2026-07-24T10:00:00Z",
  "current_stage": 1,
  "current_chapter": 1,
  "phase": "baseline",          // baseline | plan | learn | plan-quiz | stage-end | stage-handoff | done
  "stages": [
    {
      "n": 1,
      "name": "基础",
      "status": "in_progress",  // pending | in_progress | passed | failed
      "chapters": [
        { "n": 1, "slug": "intro", "doc_version": 1, "status": "passed",
          "chapter_quiz_score": 0.70, "plan_quiz_score": 0.90, "combined": 0.81,
          "attempts": 1 }
      ]
    }
  ],
  "baseline_score": 0.3,        // 0..1, drives initial difficulty
  "history": [                  // append-only event log
    { "ts": "...", "event": "init", "detail": "topic=ml level=practitioner" }
  ]
}
```

`phase` tells you exactly what to do on resume. Transition it explicitly every step.

## How "submit a quiz" works in practice

Quizzes are now **HTML forms**, not markdown the user edits. The flow (see `references/html-format.md` for the full mechanism):

1. You generate `<quiz>.html` (quiz-form skeleton) and tell the user the file path to open in a browser.
2. The user answers in the form — clicking radio/checkbox options for 选择题, typing into textareas for 实战/模拟/算法/综合题 — then clicks the **提交答案** button at the bottom.
3. The submit JS serializes all answers into `<quiz>-answers.json` and **auto-downloads** it (and also displays the JSON on-page as a fallback the user can copy-paste).
4. The user tells you in chat "做好了" / "提交". **You do NOT know where the browser saved the json** — browsers download to a default folder (usually ~/Downloads), not the workspace. So ask: "请把下载的 `<slug>-answers.json` 放到测验 html 的同目录（或告诉我它的完整路径）". Placing it next to the html has a double benefit: (a) you can Read it at the predictable path `<quiz-dir>/<slug>-answers.json`; (b) **the quiz html will auto-refill the form from that sibling json on refresh** (restore-on-load — see step 7), so the user doesn't lose their answers on page reload. Two accepted handoff modes:
   - **(preferred) file:** the user moves/saves the json next to the html (or gives you an absolute path) → you Read that exact path.
   - **(fallback) paste:** the user copies the on-page JSON (from `<pre id="answerOutput">`) and pastes it into chat → you parse the pasted text as JSON.
5. You **Read the answers.json at the user-given path** (or `JSON.parse` the pasted text) — this is a clean structured object (`{quiz, submitted_at, answers: {q1: "B", q2: ["A","C"], q3: "text..."}}`), far more reliable than parsing filled markdown. Grade per `references/grading.md`. **If Read fails (file not found / download incomplete), do NOT grade — tell the user "没找到文件，请确认下载已完成并告诉我完整路径（或直接把页面底部的 JSON 粘贴给我）" and wait.** Retry on their next message.
6. If answers.json is missing question keys, has `null` values, OR has empty-string `""` values (treat all three as unanswered), tell the user which questions are unanswered and wait — don't grade an incomplete submission.
7. **Restore-on-load (built into the quiz html):** the quiz form's JS attempts `fetch('./<slug>-answers.json')` on page load and refills the form (radio/checkbox/text/textarea) from it, so a refresh isn't blank once the json sits next to the html. If the browser blocks file:// fetch (Chrome often does) or the file isn't there, it falls back to a `localStorage` cache written at submit time. **Tell the user this when you hand over the quiz**: "作答提交后，把下载的 json 放到这个 html 同目录，下次刷新页面会自动恢复你的答案（Chrome 若不自动恢复，可粘贴页面底部的 JSON）". You don't implement this — it's already in the canonical submit JS (`references/html-format.md`); just ensure the generated quiz uses that JS verbatim.

Concretely, every "wait for submission" step means:
1. Tell the user the HTML file path to open + "作答完点提交答案，把下载的 json 放到这个 html 同目录（方便刷新恢复+我读取），然后跟我说「做好了」".
2. Stop. End your turn.
3. On their next message claiming completion, ask for the json path (or accept pasted JSON), Read/parse it, and verify completeness before grading. Never assume a default path.

**Grading write-back is dual + restore**: write `grading.json` (structured, for AI resume) AND fill each question's inline `<div class="feedback" id="fb-qN">` slot in the quiz HTML (inject ✓/✗/△ + 失分点 directly under the question) AND fill `<script id="restoreData">` with the user's answers (same payload as answers.json's `answers` field, so the form auto-refills on refresh — no fetch/CORS dependency) + the `<div id="gradingSummary">` summary. Exact Edit recipe in `references/html-format.md`.

## Initialization flow (first run only)

1. **Capture the topic and target level.** Ask the user what they want to learn and at what target level. Map their phrasing to one of three calibrated levels — this drives plan difficulty, not just `baseline_score`:

   | 用户说法 | 映射 level | 对计划的影响 |
   |---------|-----------|-------------|
   | "了解"、"入门"、"能用一下" | `aware` | 少阶段、宽覆盖、综合题轻量、允许跳过最深内容 |
   | "能独立解决实际问题"、"工作中用"（默认） | `practitioner` | 标准深度、实战题为主、综合题要求设计方案 |
   | "能教别人"、"面试通过"、"精通" | `expert` | 多阶段、推导/算法/综合占重、要求能解释 trade-off 与边界 |

   If they only give a topic, assume `practitioner` and say so. Record `target_level` in `meta.json` — every chapter planner and stage planner receives it.

2. **Create the workspace.** Make the directory tree above with an initial `meta.json` (`phase: "baseline"`, `target_level` set, `locale` chosen from the user's language) — including the `notes/` directory (学习空间 UI 独占，AI 不写其中文件；UI 打开章节时按 chapterKey 读对应笔记并自动保存).
3. **Author the baseline assessment.** Read `references/quiz-types.md` and `references/templates.md`, then generate `00-baseline/baseline.html` (quiz-form, per `references/html-format.md`; 中文: `00-基线测评/基线测评.html`) with a broad diagnostic across the six question types. The point is to probe what the user already knows — include easy through hard items so you can locate their level, not just stump them. Aim for ~15–25 questions scaled across the domain's breadth.
4. **Hand it to the user.** Tell them the file path, ask them to fill in their answers (or write "don't know"), and follow the upload protocol above. Stop and wait — do not proceed until they upload and you've Read it back.

Why stop: the entire plan is calibrated to their baseline. Guessing produces a plan that's either boring or brutal.

## Planning flow

Triggered when `phase` is `baseline` (after grading) or when starting a new stage.

The master plan is the most important artifact in the loop — it must be **grounded in how the field is actually taught**, not invented from AI memory. So planning now starts with a curriculum-research subagent pulling a real learning path, then AI adapts it to the user's baseline.

1. **Grade the baseline.** Read the submitted `baseline-answers.json` (from the baseline.html form), score it, record `baseline_score` and a short qualitative profile (strengths/gaps) in `meta.json` history.
2. **Dispatch a curriculum-research subagent (MANDATORY).** Read `references/curriculum-research.md` and `references/subagent-protocol.md` (Job 5). The subagent fetches ≥2 authoritative learning-path sources (official docs learning pages, canonical roadmaps, authoritative book TOCs) and returns: (a) a **canonical path skeleton** — the consensus stage/chapter structure with source URLs on each, prerequisite notes, and common-teaching gotchas; AND (b) **per-chapter material cards** written to `plan/sources/stageN-chXX.md`, each a one-paragraph reference summary of that chapter's topic from official docs, so later chapter-generation has authoritative material to draw on. On network failure, follow graceful degradation in `references/curriculum-research.md` (AI plan + banner) — do not abort.
3. **Adapt the skeleton to the user (AI's role = adapter, not architect).** Take the subagent's canonical path + the baseline profile + target_level, and adapt per the allowed-adaptations table in `references/curriculum-research.md`: merge/split chapters for the user's level, add remedial chapters for baseline gaps (marked `补强`), drop the deepest chapter if target_level=aware, adjust depth emphasis. **Never invent a stage axis that contradicts the sources.** Every deviation from the canonical path must be recorded with a reason. The result is grounded structure + user calibration.
4. **Write `plan/master-plan.html`** (read-mode HTML) from the adapted skeleton. Read `references/templates.md` (read-mode skeleton + master-plan content structure) and `references/html-format.md`. It must include: source citations on each stage/chapter (`[出处: url]` or `[AI推断]`), an explicit "adaptations" section listing every deviation from the canonical path with reasons, and a prerequisite-ordering note. Keep chapters atomic: one concept group each.
5. **Build stage 1, chapter 1.** Generate — now grounded by the per-chapter material card at `plan/sources/stage1-ch01.md`:
   - `chapters/stage1-ch01-<slug>.html` (read-mode HTML) — the actual teaching content, calibrated to baseline AND grounded by the material card. Read `references/templates.md` (read-mode skeleton + content structure). **The doc MUST include a 知识点清单 + 考点断言 section**: 4–8 KPs, each with 3–6 testable assertions (`KP1-A1…`) — this inventory is the single source of truth for what the chapter's quiz may test. Each core concept must be taught with the **six-element structure** (①精确定义/②直观演示/③最小例子/④推导或代码/⑤边界条件/⑥与相关概念对比) followed by a **零-JS 检查点** (`<details>` self-test, 2–3 questions). **Analogies are banned** — intuition is carried by the ② embedded demo + 观察要点. Formatting is part of the spec: ① per-claim list items, ⑤ a `<ul>` of cases, ⑥ a comparison table. The chapter-generation subagent MUST Read the material card first and ground its content in it. **Skeleton provenance:** Read `references/templates.md` and copy the read-mode skeleton + `<style>` **verbatim from the template** — never copy structure/style from an existing sibling `chapters/*.html` (it may be from an older skill version). The generated file must carry the `<!-- learning-loop skeleton: read-mode -->` signature. **Optional web enhancement:** the chapter planner MAY additionally fetch from whitelist sources (`references/web-research.md`) for live data beyond the card.
   - **Interactive visualizations (default ON, waiver only):** per `references/visualization.md`, EVERY core concept gets an interactive demo at `chapters/viz/stageN-chXX-<kp-slug>.html` unless it is pure recall (waiver must be reasoned in `visualization_decisions`; expect 5–8 demos per chapter). Demos are embedded inline in the concept's **② 直观演示 slot** (as a `<figure class="viz">` `<iframe>` in the HTML) plus a `observe` list of 2–3 action items. The demo must show the mechanism itself, cover the KP's key branches including at least one ⑤ boundary case, and be user-operable (step + reset, ideally a scenario/value control).
   - `quizzes/stage1-ch01-quiz.html` (quiz-form HTML) — the chapter quiz using all six types. Read `references/quiz-types.md` + `references/templates.md` (quiz-form skeleton). Chapter quizzes stay small (6–10 questions, six types ≥1 each). **Every question is a `<fieldset data-qid data-kp data-assert data-type data-points>`** carrying the assertion tags (`data-assert="KP-2-A3"`; replaces the old `[考点: KP-x]` md tag). The submit JS (canonical, from `references/html-format.md`) must be present verbatim. **Skeleton provenance:** copy the quiz `<style>` fresh from `references/templates.md` (not from a sibling quiz); the file must carry the `<!-- learning-loop skeleton: quiz-form -->` signature. Before finalizing, the planner self-checks coverage: for each question, confirm every `data-assert` ID maps to an assertion in the chapter's 断言清单.
6. **Verify ALL generated HTML before handing to the user** (chapter doc + quiz + any viz). For each HTML file, run the JS static checks in `references/html-format.md` / `references/visualization.md`: syntax (`node --check` on extracted `<script>`), required-element existence (`<form id="quizForm">`, `<button id="submitBtn">`, `<pre id="answerOutput">` for quizzes; titled sections + per-concept checkpoint sections + `kp-asserts` list for read-mode; step/reset controls + `reportHeight()` for viz), no undefined `getElementById` references, and (quizzes) every `data-qid` has a matching form control. **Skeleton-provenance gate (mandatory):** every read-mode HTML must contain `<!-- learning-loop skeleton: read-mode -->` and every quiz must contain `<!-- learning-loop skeleton: quiz-form -->`. A missing signature means the file was built by copying an old sibling instead of the current `references/templates.md` — **do not ship it; regenerate from the template first**. **Assertion-coverage gate:** every `data-assert`/quizKey `assert` ID resolves to the chapter's 断言清单 — rewrite unresolvable questions now, not at grading time. **Formatting gate:** ⑤边界条件 renders as a `<ul>` (no inline `a) b) c)` inside an el-body paragraph), every concept's ② slot holds an embedded demo or a reasoned waiver. **Contamination guard:** no `--vscode-`/`icube-` CSS junk in the file. A file failing any check is NOT shipped: re-dispatch to fix, or degrade that one artifact to markdown per `references/html-format.md`. Never hand the user an HTML that errors on open.
7. Set `phase: "learn"` and tell the user to study and fill the quiz.

Do not generate chapters beyond the current one up front. The next chapter is built by a subagent after this one passes — that's how the loop adapts.

## Learning + chapter-quiz flow

1. User studies `chapters/stageN-chXX.html` (opens in browser — point them at the 学习路线 pill at the top: 通读 → 每个概念操作②的演示 + 做检查点 → 答错回看对应要素 → 全部检查点通过再开测验), then opens `quizzes/stageN-chXX-quiz.html`, answers via the form, clicks 提交答案 → `stageN-chXX-quiz-answers.json` downloads → tells you "做好了" (see "How submit a quiz works").
2. **Read `quizzes/stageN-chXX-quiz-answers.json`** (structured, clean) — verify every question key is present (null/missing = unanswered; tell user which, wait).
3. **Coverage check (覆盖度校验) — before grading.** Open the chapter doc HTML and read its **知识点清单 + 考点断言 (assertion inventory)**. **Also read `<script id="quizKey">` from the quiz HTML** — this is the structured answer key (never regex-parse the HTML). For every question in answers.json, look up its assertions from quizKey (`questions[i].assert`) and verify each ID exists in the inventory (fall back to `kp`-level matching for older quizzes without `assert`). Any question whose assertion isn't taught → flagged **超纲 (out-of-scope)**, excluded from scoring per `references/grading.md`.
4. Grade the quiz using `references/grading.md` (answers now come from the json, not parsed md). Apply 超纲 rule. **Write grading back**: (a) `quizzes/stageN-chXX-quiz-grading.json` (structured per-question record for AI resume); (b) fill each question's `<div class="feedback" id="fb-qN">` slot in `stageN-chXX-quiz.html` with that question's ✓/✗/△ + 失分点 (inline, directly under the question); (c) **fill `<script id="restoreData">` in the SAME html with the user's answers** (`{"answers":{...}}` — copy the `answers` field from answers.json); (d) fill `<div id="gradingSummary">` with `章节测验得分：0.XX`. Steps b/c/d are three independent Edits (per the recipe in `references/html-format.md`). The user reopens the HTML and sees each verdict next to its question AND the form auto-refills with their answers.
5. **If any 超纲 question was found — 补讲补考 (re-teach + re-test), mandatory.** Per `references/grading.md`: tell the user which question was out-of-scope and why; append the missing concept to the chapter doc as a **补讲 section** (after 核心概念, before 实战演示): under `<h2 id="sec-backfill">补讲</h2>`, add `<h3 id="backfill-<slug>">title <span class="backfill-badge">补讲</span></h3>` + `<p class="backfill-meta">KP·日期·来源</p>` + the six-element `<ol class="elements">` (② 直观演示 may be waived in a 补讲 with a stated reason) + 1–2 checkpoint questions, **AND append the newly-taught assertions to the `kp-asserts` inventory** so the replacement question has an in-scope target, **AND add a matching quick-jump entry under the left TOC's 补讲 group** (`<p class="toc-sub">补讲</p>` + `<a href="#backfill-<slug>">…</a>`) so the user can click to it — see `references/templates.md` / `references/grading.md`; generate ONE replacement question of the same type & point value on the newly-taught concept and ask it (inline if plan-quiz hasn't run yet, append to the plan-quiz round otherwise). The replacement counts normally. Do not leave the user with a gap caused by the course's own under-teaching.
6. Record `chapter_quiz_score` (post-超纲-exclusion) in `meta.json`.
7. **Immediately run the plan-quiz** (`phase: "plan-quiz"`). This is the transfer check: ask the user 5–10 questions LIVE (in chat, one at a time) that are *deliberately different* from the chapter quiz — new scenarios, edge cases, cross-concept links. The chapter quiz checks "did you read this chapter"; the plan-quiz checks "can you use it". Read `references/quiz-types.md` for the mix — lean toward 实战/模拟/算法/高难度 here, lighter on 选择/填空. **Plan-quiz questions must also pass the coverage check** — if a live plan-quiz question turns out to be out-of-scope, stop, mark it 超纲, re-teach, and ask a replacement instead of grading it.
8. Grade the plan-quiz with `references/grading.md` (same 超纲 exclusion).
9. **Write the plan-quiz to `quizzes/stageN-chXX-plan-quiz.md` INCREMENTALLY** (not only post-hoc). Create the file with the header when the plan-quiz round STARTS, and append each Q&A (question + user's answer + AI 讲评) to it as the round progresses — so an interrupted plan-quiz is recoverable on resume. At the end of the round, append the AI 批阅区 table + summary line. Even though it was a live round (not pre-filled by the user), the full Q&A + per-question 讲评 + 批阅区 must end up in the file — same format as `references/templates.md`'s plan-quiz template. Do NOT leave the plan-quiz only in chat; the user needs a durable record next to their chapter quiz when prepping for the stage-total.
10. Compute the **combined score = 0.45 × chapter_quiz + 0.55 × plan_quiz** (both post-超纲-exclusion; weights in `references/grading.md`). **Threshold: combined ≥0.80 to pass.** Record the plan-quiz result to `meta.json` history as a `plan_quiz` event (Q&A, score, dimension breakdowns), and write the combined score + pass/fail into the plan-quiz file's summary line.

Why write the grading to the file: the user's filled quiz is their record of attempt and correction. A score that only lives in chat scrolls away; the per-question 失分点 written next to each answer is what they actually review against.

### On pass (≥80%)

1. Walk through every wrong or partial answer: the correct reasoning, why the user's answer missed, and the underlying concept. This teaching step is mandatory — passing is not a reason to skip it.
2. **Dispatch a subagent** (read `references/subagent-protocol.md`) to write `wiki/stageN-chXX-wiki.md`: a compact record of what was learned, what was shaky, misconceptions seen, and explicit guidance for planning the *next* chapter (e.g. "user struggles with X, reinforce via Y next").
3. **Dispatch a subagent** to plan + draft the *next* chapter doc and its quiz, feeding it the chapter wiki so it adapts. If this was the last chapter in the stage, instead go to Stage-end flow.
4. Update `meta.json` (chapter status `passed`, advance `current_chapter`), set `phase: "learn"`.

### On fail (<80%)

Follow the rebuild loop in `references/grading.md` (max 3 attempts, approach must change each version, escalation rules after v3). Summary:

1. Identify the specific failure points from both quizzes (use the 失分点 rows you wrote during grading).
2. **Rebuild, don't retry.** Generate `chapters/stageN-chXX-<slug>_v2.html` (read-mode HTML; increment the version suffix; keep the original) that re-teaches the weak concepts with a different angle, more examples, simpler scaffolding. Bump `doc_version` and `attempts` in `meta.json`. **Rebuilds are the most common place a stale sibling skeleton gets copied** — always Read `references/templates.md` and start from its current skeleton + `<style>`, not from the previous version's file.
3. Generate a matching `quizzes/stageN-chXX-quiz_v2.html` (quiz-form) with new questions focused on the weak spots.
4. Set the chapter status to `failed`, `phase: "learn"`, and tell the user to re-study. Loop back to the top of this flow when they re-upload.
5. **After v3 still fails (attempts = 3), stop.** Do not generate v4. Present the user the options in `references/grading.md` (pause / simplify target / drop to a prerequisite chapter).

Version suffixes exist so the user (and you) can see the learning history. Never overwrite a chapter doc — always version up.

## Stage-end flow

**Generate the stage total quiz when the LAST chapter of the stage passes**, before asking the user anything. Do not pre-generate it at stage start — by the time the last chapter is done you know exactly which concepts were shaky across the stage, and the total quiz should re-probe exactly those (plus the broader stage coverage). The flow:

1. **Dispatch a web-research subagent FIRST.** Read `references/web-research.md` and `references/subagent-protocol.md`, dispatch a web-researcher with the stage's full scope (all chapter topics + the cumulative weak spots from chapter wikis). It returns a structured brief of facts + gotchas, each with a whitelist source URL. This step is **mandatory** for the stage-total — the volume and factual rigor required here is exactly where AI-alone drifts. If the network fails, follow graceful degradation in `references/web-research.md` (do not abort).
2. **Generate `quizzes/stageN-total-quiz.html` (quiz-form) from the research brief.** Volume per `references/templates.md`'s stage-total content structure: **≥2–3 questions per chapter, each of the six types with ≥2 questions, ≥2 cross-chapter 综合.** Compose questions from the research subagent's facts/gotchas — every question that used a fact carries `[出处: url]` in its qmeta div; questions without a source (degraded path only) carry `[未验证]`. Render into the quiz-form HTML skeleton (data-qid/data-kp/data-type/data-points fieldsets + canonical submit JS). Add the 数据增强状态 banner near the top.
3. **Tell the user the file is ready and follow the submission protocol** (see "How submit a quiz works") — stop, wait for them to fill the form and report done.
4. On submission: Read `stageN-total-quiz-answers.json`, verify complete, grade with `references/grading.md`.
5. **Write the grading back** (same triple write-back as chapter quizzes): `stageN-total-quiz-grading.json` (structured) + fill each question's `<div class="feedback" id="fb-qN">` slot in `stageN-total-quiz.html` with ✓/✗/△ + 失分点 (+ 出处/验证状态) + **fill `<script id="restoreData">` with the user's answers** + `<div id="gradingSummary">` with `阶段总测验得分：0.XX`. Mandatory; do not only announce in chat.
6. **Pass = ≥0.80.** On fail, identify the weakest chapter from the 失分点 rows, mark that chapter `failed`, and loop the rebuild flow (`On fail`) for just that chapter. After it re-passes, re-issue a new `stageN-total-quiz_v2.html` (version suffix, keep original) — the user re-takes the stage total, and re-dispatch the web-research subagent if the failure was on a `[出处]`-tagged factual question (the source may have been misread).
7. On pass: update `meta.json` (stage `passed`, advance `current_stage`), append a row to `wiki/progress.md`.
8. **Ask the user**: "本阶段通过。是否进入下一阶段？" Do not auto-advance — respect the pause.
9. On yes: **if this is the LAST stage** (check `stages` array in meta.json — current_stage is the last one), set `phase: "done"`, congratulate the user on completing the full course, and summarize what they've mastered across all stages. **If there ARE more stages, do NOT start the next stage in this session.** Instead:
   - Set `phase: "stage-handoff"` in `meta.json` and write to disk.
   - Tell the user: "本阶段已完成。请**新开一个 DSH 会话**，在同一目录下输入 `/learning-loop` 或说「继续学习」——新会话上下文清空，AI 会更稳定，会自动接续下一阶段。"
   - **Do NOT dispatch the stage-planner**, do NOT set `phase: "learn"`. Stop. The stage-planner dispatch happens at the START of the new session (see Resume checklist `stage-handoff` branch).
     On no: set `phase: "done"` and summarize what they've mastered.

The stage total is a real gate, not a formality — if it's too easy to pass without mastery, the loop leaks. Calibrate its difficulty to the stage's actual content, not to "make the user feel good".

## Question types — non-negotiable

Every quiz (chapter, plan, stage-total, baseline) must include a mix from all six types. Read `references/quiz-types.md` for the full spec, but the rule is: **never ship a quiz that is only 选择 + 填空.** 实战 (real tasks), 模拟 (scenario roleplay), 算法 (derive/design), and 高难度 (synthesis/stretch) must appear. The mix adapts to the chapter and the user's level — that's the "动态适配" the user asked for.

## Subagents — when and how

Use the DSH `subagent` (isolated) / `subagent_fork` (context-inheriting) tools for five jobs, all detailed in `references/subagent-protocol.md`:

- **Wiki writer** — after a chapter passes, records learning state for future planning.
- **Next-chapter planner** — after a chapter passes, drafts the next chapter + quiz using the wiki as input. This is what makes the loop adapt. May optionally dispatch web research to strengthen examples (see chapter planning note below).
- **Stage planner** — when advancing stages (typically in a fresh session after stage-handoff), plans the whole next stage.
- **Web researcher** — fetches authoritative-source material to ground the stage-total quiz in real facts. **Mandatory before every stage-total quiz.** Read `references/web-research.md` before dispatching. Returns a brief (facts + sources + gotchas); does NOT write the quiz itself.
- **Curriculum researcher** — fetches a canonical learning path (official docs/roadmaps/book TOCs) + per-chapter material cards, grounding the master plan in how the field is actually taught. **Mandatory before the initial master-plan and before each new stage.** Read `references/curriculum-research.md` before dispatching. Returns the skeleton + cards; AI adapts, the subagent does NOT write master-plan.html.

Subagents run isolated; give them the wiki content and the templates inline so they don't have to rediscover format. Always pass `references/templates.md` and `references/quiz-types.md` content (or the relevant slices) in the prompt.

## Resume checklist (every non-first invocation)

1. Find `*-learning/meta.json` in the current directory.
2. Read `meta.json` + `wiki/progress.md`. **Also read the current chapter's `*-grading.json`** (if it exists) — it's the structured per-quiz record and may be more recent than meta.json if a run was interrupted between grading and updating meta. Reconcile: trust grading.json's score over a stale meta.json score for the same quiz.
3. **Locate the highest-version chapter doc** — glob `chapters/stageN-chXX-*_v*.html` and pick the highest `_vN`; this is the current doc regardless of what meta.json's `doc_version` says (meta may lag if a rebuild happened but meta wasn't bumped yet). Point the user at that one.
4. Branch on `phase`:
   - `baseline` → re-issue the baseline assessment or wait for upload.
   - `plan` / `learn` → point user at the highest-version chapter doc + the current quiz.
   - `plan-quiz` → **check `quizzes/stageN-chXX-plan-quiz.md` for partial Q&A first.** If it has entries but no 批阅区 summary, resume the plan-quiz from where it left off (continue asking the remaining questions) rather than restarting from scratch. Only restart if the file is empty/missing.
   - `stage-end` → re-prompt the stage-end question.
   - `stage-handoff` → **this is a fresh session after a completed stage.** Dispatch the stage-planner subagent (read `references/subagent-protocol.md`) to plan the next stage (chapters + first chapter doc + quiz). Then set `phase: "learn"` and present the first chapter to the user. The handoff preserves context cleanliness — the new session has zero accumulated chat history, reducing error rates.
   - `done` → summarize mastery, offer a new topic.
5. State in one line where the user is and what's next. Don't dump the whole plan.

## Communication style

- After every transition, give the user a one-line status (stage/chapter/phase) and the single next action. Long status dumps break the learning flow.
- When asking the plan-quiz live, ask one question at a time and wait — don't batch.
- When analyzing wrong answers, teach the concept, don't just reveal the answer. The user should be able to re-derive it.
