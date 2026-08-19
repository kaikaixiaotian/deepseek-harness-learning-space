# Upgrade Protocol

`upgrade` = **update the skill itself first, then migrate workspaces** — both steps, one invocation, in that order. Trigger on `learning-loop upgrade`, `/learning-loop upgrade`, or any request to 升级/更新 the learning-loop skill. **Do NOT treat "upgrade" as a workspace-only migration**: without step 1 the local skill files are still the old version, so "generate per the current spec" is a promise the installed files can't keep.

## Step 1 — Update the skill itself (mandatory, comes first)

The preset directory is **install-managed** (the repository's `install.ps1` copies the preset into place and registers the plugin packages). The supported update path is the installer, not in-place git operations:

1. Locate the install dir: the preset directory `$DSH_HOME/.agent-presets/learning/` (Windows: `C:\Users\<user>\.dsh\.agent-presets\learning\`); the skill lives in its `skills/learning-loop/` subdirectory. If it doesn't exist, tell the user and stop.
2. Record `旧版本`: read `preset.yml`/skill frontmatter or any local version marker if present (fallback: `"(unknown)"`).
3. **Tell the user to run the installer themselves**: re-run `install.ps1` from the dsh-learning-space repository clone (or the one-line download command in its README), then **restart dsh web**. It refreshes the preset directory with a clean copy and re-registers the plugins. Do NOT run `git pull` inside the preset dir and do NOT edit its files — it is a managed copy.
4. If the installer is genuinely unavailable (no repository access), the manual fallback is: back up `<presetDir>` to `<presetDir>.bak.<timestamp>`, then copy a fresh `preset/` tree from a repository clone over it. Set `旧版本 = "(manual copy)"`.
5. The `/learning-loop` command is auto-derived from the skill by DSH (user-invocable skills are exposed as `/name`), so there is **no separate command file to sync**.
6. After the user confirms the update (or the fallback finished), record `新版本` from the new files. This is the value step 2 stamps into workspaces.

## Step 2 — Migrate workspaces (mark them, don't patch them)

1. For each learning workspace in the current directory (folders whose name ends with a `references/naming.md` workspace suffix — e.g. `-learning` / `-学习` — and that contain a `meta.json`), read its `meta.json`.
2. Write two fields to `meta.json`:
   - `"schema_version": "<新版本>"` — marks this workspace as upgraded (e.g. `"1.4.1"`).
   - `"upgraded_at": "<ISO timestamp>"` — when the upgrade happened.
3. Append a `history` event: `{ "ts": "...", "event": "upgraded", "detail": "schema_version=<新版本>; existing files untouched; subsequent generation follows current spec" }`.
4. Print a one-line summary per workspace: "<workspace> upgraded. Existing files unchanged. New chapters/quizzes will use the current format (quizKey + restoreData + restore JS + feedback slots)."

That's the whole of step 2. No file scanning, no patching, no HTML editing.

## Step 3 — Report

- skill: `新版本 != 旧版本` → "✅ skill 已从 v旧版本 升级到 v新版本"；相同 → "✅ skill 已是最新 v新版本"。
- workspaces: list how many were migrated (or "当前目录无学习工作区，仅升级 skill 本体").
- Remind the user: 新开一个 DSH 会话以加载最新 skill。

## Design principle (why step 2 only marks, never patches)

Old workspaces were created by earlier skill versions — their quiz HTMLs may lack `quizKey`, `restoreData`, restore JS, or `feedback` slots. **Upgrade does NOT patch those existing files.** They keep working as-is (the AI falls back to reading questions when grading a quiz without quizKey; the form just won't auto-refill if restoreData is absent — annoying but not broken). Upgrade's only job is to ensure **everything generated from now on** follows the current spec.

Why not patch old files: patching is risky (could corrupt a working HTML), non-idempotent if done wrong, and unnecessary — old files still function. New chapters/quizzes are where the improvements matter, and those are generated fresh by the current skill, which already emits the full feature set.

## What changes after upgrade

Nothing about existing files. But the AI's behavior for **new** content in this workspace now follows the current skill spec automatically (step 1 just installed it) — and this is now **enforced, not just promised**: every generated chapter/quiz must carry a `<!-- learning-loop skeleton: ... -->` signature that the main agent greps for before shipping, so new content can no longer silently inherit an old sibling's visual skeleton:

- New chapter docs → read-mode HTML per **spec 2.0**: 知识点清单 + 考点断言 inventory (each KP with 3–6 testable assertions), six-element concepts with **② 直观演示** (embedded interactive demo + 观察要点 — **analogies are banned**), per-concept **检查点** (`<details>` self-test), anti-wall-of-text formatting (① per-claim list items, ⑤ case `<ul>`, ⑥ comparison table).
- New demos → **default-on per concept** (expect 5–8 per chapter; waiver only for pure-recall KPs with a recorded reason), meeting the "真正的演示" quality bar: mechanism itself visible per step, boundary-case branch coverage, user-operable.
- New quizzes → quiz-form HTML with `quizKey` (+ per-question `assert` field) + `restoreData` slot + restore JS + per-question `feedback` slots + `gradingSummary`; every `data-assert` must resolve to the chapter's 断言清单 at generation time.
- New stage-total → web-research-grounded, six types, citations.
- New stage transitions → stage-handoff (fresh session).
- Extra delivery gates: assertion-coverage check, formatting gate, and a `--vscode-`/`icube-` contamination guard (a generated chapter once shipped with ~1900 lines of accidentally-pasted IDE CSS).

The `schema_version` marker exists so the AI knows, on resume, that this workspace has been upgraded — it should NOT attempt to "fix" old files (they're intentionally left as-is), and should generate new content per the current spec.

## Grading old quizzes (those without quizKey)

When the AI grades an **old** quiz HTML that lacks `quizKey` (because it predates the feature and upgrade didn't patch it), it falls back gracefully:
- Read the quiz HTML, extract each question's `data-qid`/`data-kp`/`data-type`/`data-points` from the `<fieldset>` attributes (these exist even in older HTMLs).
- Read the question text + options to determine the correct answer (objective) or scoring dimensions (subjective).
- Grade as usual against the user's answers.json.
- Write grading back: grading.json + per-question feedback slots IF they exist in the HTML; if the old HTML lacks feedback slots, just write grading.json and report the breakdown in chat.

This fallback is less stable than reading quizKey, but it works. The user can choose to regenerate a specific quiz (via the normal rebuild flow) if they want the full feature set on that chapter — but upgrade never forces it.

## What upgrade does NOT do

- Does NOT scan or modify existing workspace files (quiz/chapter HTMLs, markdown, grading data) — step 1 updates **skill files only**.
- Does NOT rebuild quizKey for old quizzes.
- Does NOT migrate old markdown files.
- Does NOT change the learning plan, stages, progress, or any grading/answers data.
- Does NOT enter the learning flow (user runs `/learning-loop` separately to continue).
