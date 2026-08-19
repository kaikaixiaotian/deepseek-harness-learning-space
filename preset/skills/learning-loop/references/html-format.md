# HTML Format Protocol

All **user-facing artifacts** in the learning-loop are standalone HTML files (not markdown). This file defines the two HTML modes, the answer-submission mechanism for quizzes, and the verification flow. Read before generating ANY user-facing file (chapter doc, master plan, baseline, chapter-quiz, stage-total-quiz).

The plan-quiz is the ONLY exception — it stays as live chat + a post-hoc markdown receipt (see `references/templates.md`). Do not migrate plan-quiz.

## Why HTML, not markdown

Markdown quiz files force the user to edit raw text (`**你的答案：** ___`), which is error-prone and unpleasant. HTML lets the user **click radio buttons for single-choice, tick checkboxes for multi-choice, and type into textareas for written answers** — the interaction matches the question type. Read-mode docs (chapter docs, master plan) also render far better as styled HTML than as raw markdown. The cost is generation complexity, managed by the static-check flow below.

## Two HTML modes

### Mode A: read-mode (chapter docs, master plan, progress)

User only **reads** — no form, no submission. A chapter doc is a long, styled, scrollable page with a sticky table of contents, the six-element concept structure (①③④⑤⑥ as a scannable `ol.elements` definition list whose bodies are sub-lists/tables of discrete claims — never a wall of text; ② 直观演示 holds the embedded interactive demo + 观察要点), a KP list **with the 考点断言 inventory** (`kp-asserts`), 🖼️ visualizations **embedded inline** in each concept's ② slot as `<iframe>` (loaded from `./viz/*.html`, with an "open in new tab" fallback link), and a zero-JS **检查点** after each concept (`<details><summary>` self-test questions with expandable answers). The master plan is a collapsible stage tree with a progress bar. The only JS in a chapter doc is the viz auto-height listener; checkpoints use native `<details>`.

### Mode B: quiz-form (baseline, chapter-quiz, stage-total-quiz)

User **fills a form and submits**. This is where HTML earns its keep — interaction matches question type. Structure:

| Question type | HTML control | Notes |
|---------------|--------------|-------|
| 选择题（单选） | `<input type="radio" name="q1" value="A/B/C/D">` | one radio group per question |
| 选择题（多选） | `<input type="checkbox" name="q2" value="A/B/C/D">` | checkboxes share a name; multiple values |
| 填空题 | `<input type="text" id="q3">` or `<textarea>` for multi-blank | short answer |
| 实战/模拟/算法/综合 | `<textarea id="qN" rows="6">` | long-form answer |

Every question sits in a `<fieldset class="question" data-qid="q1" data-kp="KP-2" data-assert="KP-2-A3" data-type="选择" data-points="1">`. The `data-*` attributes carry the metadata that used to be inline md tags (`[考点: KP-2·A3]`, `(选择题, 1分)`) — the AI reads them from the HTML when grading, and they drive the per-question display. `data-assert` lists the assertion IDs the question tests (comma-separated when multiple); every ID MUST exist in the chapter doc's 断言清单, or the question is 超纲 (see `references/grading.md`).

## answers.json — the answer-submission contract

Browsers cannot write to arbitrary disk paths from JS (security). Submission has a preferred in-space channel and standalone fallbacks, all implemented by the submit button:

1. **Learning-space bridge (preferred)** — when the quiz is opened inside the learning space (an iframe with no fetchable base URL), the submit JS sends the payload to the host via `postMessage({type:'ll-submit', id, quiz, answers})`. The learning space calls its host service, which writes `<quiz-slug>-answers.json` **next to the quiz html in the workspace** (name derived per naming.md, atomic write). The page shows a「已交卷」notice; the user just tells the AI「做好了」— the file is already where grading expects it. No download, no manual copy-back.
2. **Download (standalone fallback)** — outside the learning space, JS builds a `Blob` and triggers a download named `<quiz-slug>-answers.json`. The user saves it into the quiz's directory (or anywhere — they tell the AI the path).
3. **On-page display** — the same JSON is rendered into a `<pre id="answerOutput">` block at the page bottom, so the user can copy-paste it into chat if both channels above are awkward.

The user then tells the AI "做好了". In-space, the answers file already sits next to the quiz — the AI simply Reads it (also when the user says nothing and the file exists). Standalone, the user points to the downloaded file or pastes the JSON.

**Theme adaptation (the `ll-*` classes):** all three skeletons (read-mode, quiz-form, viz) consume `--dsw-alias-*` tokens with the dsh static palette as fallback, so they render correctly standalone (dark via `prefers-color-scheme`) and follow the host theme in-space. The learning space's theme bridge snapshots the host's RESOLVED tokens into the iframe on open and on every host theme flip, and marks `<html>` with: `ll-dark` / `ll-light` (scheme) and `ll-glass` (a glass skin like ui-aqua is active — the page canvas turns translucent so the host card's glass and the ambient behind it stay visible). The `html.ll-dark` rule re-declares every scheme-dependent var with dark static fallbacks, so even a token-snapshot gap renders dark — never a white canvas. When a chapter doc embeds viz demos, the bridge injects the same snapshot into each inlined demo blob, so demos open pre-themed. These three classes are part of the canonical `<style>`; never strip them when generating.

**Live theme channel (the `ll-theme` listener):** every skeleton ships a small `<script>` (before `</body>`, `llApplyTheme` + an `ll-theme` message handler) that re-skins the page IN PLACE when the host pushes a `{type:'ll-theme', css, dark, glass, nonce}` postMessage — theme switches and glass-knob drags must not reload the iframe (a reload would wipe in-progress quiz answers). The handler rewrites the `#ll-theme` style, swaps the `ll-dark`/`ll-light`/`ll-glass` classes, forwards the message into any embedded demo iframes, and replies `{type:'ll-theme-ack', nonce}`. Keep this script verbatim. Older files without it still work — the host falls back to re-injecting on open.

**answers.json schema:**
```json
{
  "quiz": "stage1-ch01-quiz",
  "submitted_at": "2026-07-29T16:00:00Z",
  "answers": {
    "q1": "B",
    "q2": ["A", "C"],
    "q3": "commit",
    "q4": "git add app.js\ngit commit -m \"修复登录bug\"",
    "q5": "我会先怀疑 force push..."
  }
}
```

- Objective questions (radio) → string (the chosen value).
- Multi-select (checkbox) → array of strings.
- Text/textarea → string (the typed answer, newlines preserved).
- **Unanswered → the key is OMITTED entirely.** The submit JS skips empty text fields (`if (el.value.trim())`) and radio/checkbox groups only produce a key when something is checked. So "unanswered" is uniformly a missing key across all question types — never `""`, never `null`. The AI treats missing key = unanswered. (If you ever encounter a `""` or `null` from an older JS version, treat those as unanswered too — be lenient.)

## quizKey — the answer key (AI-gradeable, not regex-parsed)

The quiz HTML MUST contain a `<script id="quizKey" type="application/json">` tag that holds the correct answer for every question. The AI reads this JSON directly when grading — **never parse the quiz HTML with regex to find correct answers**. The quizKey is filled at quiz-generation time (by the planner subagent), not at grading time.

**quizKey schema** (mandatory for every quiz):
```json
{
  "quiz": "stage1-ch01-quiz",
  "questions": [
    {
      "qid": "q1",
      "type": "选择",
      "kp": "KP-2",
      "assert": "KP-2-A3",
      "points": 1,
      "answer": "B"
    },
    {
      "qid": "q2",
      "type": "多选",
      "kp": "KP-4",
      "assert": "KP-4-A1,KP-4-A2",
      "points": 2,
      "answer": ["A", "C"]
    },
    {
      "qid": "q3",
      "type": "填空",
      "kp": "KP-1",
      "assert": "KP-1-A2",
      "points": 1,
      "answer": "commit",
      "accept": ["commit", "git commit"]
    },
    {
      "qid": "q4",
      "type": "实战",
      "kp": "KP-3",
      "assert": "KP-3-A1",
      "points": 4,
      "rubric": {
        "correctness": "应正确使用 git reset --mixed",
        "process": "步骤完整：reset → status 确认 → 说明工作区不变",
        "edge_cases": "提到未跟踪文件不受影响"
      }
    },
    {
      "qid": "q6",
      "type": "综合",
      "kp": "KP-1,KP-3",
      "assert": "KP-1-A2,KP-3-A1",
      "points": 6,
      "rubric": {
        "subproblems": ["(a) 诊断根因", "(b) 策略选择+取舍", "(c) 具体规则"],
        "key_points": ["提到了 reflog", "区分了 merge/rebase 取舍", "规则可执行非空话"]
      }
    }
  ]
}
```

**Field rules:**
- `qid` / `type` / `kp` / `assert` / `points` — mirror the `<fieldset>` attributes. `assert` lists the assertion IDs the question tests (comma-separated when multiple, format `KP-2-A3`); every ID must exist in the chapter doc's 断言清单 (`kp-asserts`) — this is what the 超纲 check keys on (older quizzes predating `assert` fall back to `kp`-level checks).
- `answer` — for objective types (选择/多选/填空): the single correct value (string for radio/填空, array for checkbox). Use `accept` for multiple acceptable phrasings on 填空.
- `rubric` — for subjective types (实战/模拟/算法/综合): NOT a single answer, but scoring dimensions + key points. The AI compares the user's answer against these dimensions, NOT against a fixed string.
- Every question must have exactly one of `answer` or `rubric` (never both).
- The array order matches the question order in the HTML (q1, q2, q3...).

## Submit-button JS (must appear in every quiz HTML)

This is the exact script pattern (identical to the quiz-form skeleton in `references/templates.md` — that skeleton is the copy source; keep the two in sync). It follows the same `render()-from-state` philosophy as visualizations: the button handler collects the form state and serializes it, preferring the learning-space `postMessage` bridge and falling back to a download. Put this inline at the end of `<body>`:

```html
<script>
(function () {
  'use strict';
  var form = document.getElementById('quizForm');
  var btn = document.getElementById('submitBtn');
  var out = document.getElementById('answerOutput');
  var notice = document.getElementById('submitNotice');

  /* learning-space bridge (ll-submit / ll-read) — see the answers.json section */
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
    var names = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === 'radio' && el.checked) {
        answers[el.name] = el.value;
      } else if (el.type === 'checkbox') {
        if (!names[el.name]) names[el.name] = [];
        if (el.checked) names[el.name].push(el.value);
      }
    });
    Object.keys(names).forEach(function (n) { answers[n] = names[n]; });
    // text + textarea (matched by id qN) — skip empty so unanswered = missing key (uniform)
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
    var payload = { quiz: slug, submitted_at: new Date().toISOString(), answers: collect() };
    var json = JSON.stringify(payload, null, 2);
    if (out) { out.textContent = json; out.style.display = 'block'; }
    try { localStorage.setItem('ll-answers-' + slug, json); } catch (e) {}
    if (inSpace) {
      btn.disabled = true;
      bridgeSend({ type: 'll-submit', id: ++msgSeq, quiz: slug, answers: payload }).then(function (reply) {
        btn.disabled = false;
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

  // ---- restore-on-load: refill the form from the saved answers so refresh isn't blank ----
  // ---- restore-on-load: refill the form from the saved answers so refresh isn't blank ----
  // Priority 0: inline <script id="restoreData"> tag (AI-injected at grading time — always works,
  //   a static part of the HTML that is loaded natively with the page, no fetch/CORS/network needed);
  // Priority 1: in-space: bridge ll-read of the sibling answers file / standalone: fetch the
  //   sibling <quiz>-answers.json (works if user placed it next to the html AND the browser
  //   allows file:// fetch — Firefox yes, Chrome often blocks);
  // Priority 2: fall back to localStorage cache (written at submit time, always works per-origin).
  function applyAnswers(answers) {
    Object.keys(answers).forEach(function (qid) {
      var val = answers[qid];
      // radio
      Array.prototype.forEach.call(form.querySelectorAll('input[type=radio][name="' + qid + '"]'), function (el) {
        el.checked = (el.value === val);
      });
      // checkbox (val is array)
      if (Array.isArray(val)) {
        Array.prototype.forEach.call(form.querySelectorAll('input[type=checkbox][name="' + qid + '"]'), function (el) {
          el.checked = val.indexOf(el.value) !== -1;
        });
      }
      // text / textarea
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
      // Priority 1 in-space: the host bridge reads the sibling answers file
      // (srcDoc has no fetchable base URL, fetch('./...') cannot work there).
      // The host derives the answers filename from the quiz file's stem plus
      // the WORKSPACE locale suffix ('-answers.json' en / '-答案.json' zh) —
      // the page cannot know the locale, so try both candidates in order.
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
      .then(function (r) { if (!r.ok) throw new Error('not found'); return r.json(); })
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
```

Non-negotiables (mirror `visualization.md`):
- Vanilla JS, `'use strict'`, IIFE, all inline, no external deps.
- `<form id="quizForm">` wraps every question; `<button id="submitBtn" type="button">提交答案</button>`; `<pre id="answerOutput">` and `<div id="submitNotice">` exist at page bottom.
- The **learning-space bridge helpers** (`inSpace` detection, `msgSeq`, `bridgeSend`) are mandatory parts of the canonical JS: submit prefers `ll-submit` (answers land in the workspace directly), restore prefers `ll-read`. Copy them verbatim from the skeleton.
- `<script id="restoreData" type="application/json" style="display:none;"></script>` exists right before `<div id="gradingSummary">` — the AI fills this tag with the user's answers at grading time, so the restore-on-load JS can refill the form without any fetch/CORS.
- `<script id="quizKey" type="application/json">` exists right after `restoreData` — **must be filled at quiz-generation time** (by the planner subagent) with the correct answers per the schema above. The AI reads this JSON when grading — never regex-parse the quiz HTML to find correct answers.
- Labels localized per the workspace locale; question types visually grouped via `<fieldset>`.
- A reset button (`type="reset"`) inside the form.
- **Restore-on-load (mandatory):** the JS MUST attempt to refill the form on page load, so a refresh isn't blank. Order: (1) inline `restoreData` script; (2) in-space: bridge `ll-read` of the sibling answers file / standalone: `fetch('./<quiz>-answers.json')` (works when the user placed the downloaded json next to the html AND the browser allows file:// fetch — Firefox yes; Chrome often blocks CORS on file://); (3) `localStorage` cache (written at submit time); (4) if all fail, leave blank. The `applyAnswers(answers)` helper sets radio/checkbox/text/textarea from the answers object. Copy the restore block verbatim from the skeleton above.

## Grading write-back

After grading (per `references/grading.md`), the AI writes results back to **two** places:

1. **`grading.json`** (next to answers.json) — the structured record the AI reads on resume:
   ```json
   {
     "quiz": "stage1-ch01-quiz",
     "graded_at": "...",
     "per_question": [
       { "qid": "q1", "type": "选择", "kp": "KP-2", "correct": true, "scored": true, "loss": "" },
       { "qid": "q2", "type": "填空", "kp": "KP-1", "correct": false, "scored": true, "loss": "混淆 A/B 定义" }
     ],
     "score": 0.70,
     "out_of_scope_count": 0,
     "verdict": "pending-combine"
   }
   ```
2. **The quiz HTML — per-question inline feedback.** Each question's `<fieldset>` already contains an empty `<div class="feedback" id="fb-qN">` slot. The AI fills each slot with that question's verdict, so on refresh the user sees the annotation **directly under the question**, not in a separate bottom table. **Exact Edit recipe (one Edit per question, plus one for the summary):**
   - For each question qN, Edit with `old_string` = `<div class="feedback" id="fb-qN"></div>` and `new_string` = a filled block:
     ```html
     <div class="feedback shown correct" id="fb-qN">
       <span class="verdict">✓ 正确</span> · [考点: KP-x] · (题型, N分)
     </div>
     ```
     The class carries the verdict: `correct` (✓) / `wrong` (✗) / `partial` (△) / `out-of-scope` (超纲). For wrong/partial, add the 失分点 (and per-dimension breakdown for subjective types) inside the block, e.g.:
     ```html
     <div class="feedback shown wrong" id="fb-q4">
       <span class="verdict">✗ 错误</span> · [考点: KP-3] · (实战题, 4分)<br>
       失分点：正确性✓ 过程✗(用了 X 而非 Y) 边界✗(漏判空输入)
     </div>
     ```
     **Critical:** the class MUST include `shown` (which flips `display:none`→`block` via the `.feedback.shown` CSS rule) AND the verdict class (`correct`/`wrong`/`partial`/`out-of-scope`) for coloring. Do NOT edit the `style` attribute — the `.shown` class handles visibility.
   - **Then inject the user's answers into the restoreData script tag** (this is what makes the form NOT blank on refresh — the restore-on-load JS reads this tag first). One Edit: `old_string` = `<script id="restoreData" type="application/json" style="display:none;"></script>`, `new_string` = `<script id="restoreData" type="application/json">{"answers":{"q1":"B","q2":["A","C"],"q3":"HEAD",...}}</script>` — the answers payload is a direct copy of `answers.json`'s `answers` field (keys=qN, values=strings or arrays per question type). No `quiz`/`submitted_at` wrapper needed — just the bare `{"answers":{...}}`. Do this AFTER all fb-qN edits so the per-question grading is already in place.
   - Then one final Edit for the summary: `old_string` = `<div id="gradingSummary" style="display:none;"></div>`, `new_string` = `<div id="gradingSummary">章节测验得分：0.XX（X/Y 分，已剔除 N 道超纲题）· 判定：通过/未通过</div>` (drop the `style="display:none"` so it shows).
   - **Do NOT touch the `<script>` block or the submit JS.** Each Edit targets only one element (unique by id: fb-qN / restoreData / gradingSummary) — safe, surgical.
   - **Post-edit verification (mandatory):** Read the HTML back. Confirm: (a) every graded question's `fb-qN` div now has class `shown` + a verdict class + content; (b) the `restoreData` tag's `textContent` is non-empty valid JSON with an `answers` object; (c) the `gradingSummary` div has no `display:none`; (d) the `<script>` submit block is intact (grep `submitBtn`/`quizForm`). If any check fails, redo that element's edit.

   Why per-question inline (not a bottom table): the user asked for "刷新后直接在对应题目看到批注" — a bottom table forces scrolling back and forth between question and verdict. Inline puts the verdict where the question is.

Both write-backs are mandatory — the per-question HTML feedback for the user's review, the JSON for the AI's resume. If an HTML edit fails after one retry, still write grading.json and tell the user the inline view is unavailable for that question (they can read grading.json or ask you in chat).

## Verification flow (mandatory before shipping any HTML)

Reuses the `visualization.md` static-check pattern, extended for forms. The main agent runs these for EVERY generated HTML (chapter doc, quiz, plan) before handing to the user:

1. **Syntax check:** extract `<script>` content, run `node --check`.
2. **Required-element existence:**
   - Quiz HTML: `<form id="quizForm">`, `<button id="submitBtn">`, `<pre id="answerOutput">`, `<script id="restoreData" ...>`, `<script id="quizKey" ...>`, `<div id="gradingSummary">`, and for each `data-qid="qN"` fieldset: a matching control AND an empty `<div class="feedback" id="fb-qN">` slot.
   - Read-mode HTML: no form requirements — titled sections exist, every concept has a `<section class="checkpoint">` with 2–3 `<details>` Q&A blocks, and the KP callout contains a `kp-asserts` list (assertion inventory).
3. **No undefined references:** every `getElementById('x')` / `querySelector('#x')` has a matching `id="x"`.
4. **Metadata consistency (quiz only):** every `data-qid` appears in the submit JS's collection logic (radios/checkboxes by name, text/textarea by id — confirm the qid matches the control's name/id).
5. **Skeleton provenance (mandatory gate):** read-mode HTML contains `<!-- learning-loop skeleton: read-mode -->`; quiz HTML contains `<!-- learning-loop skeleton: quiz-form -->`; viz demo HTML contains `<!-- learning-loop skeleton: viz -->`. A missing signature means the file was built by copying an old sibling instead of the current `references/templates.md` — regenerate from the template before shipping.
6. **Assertion coverage (quiz ↔ chapter pair):** every `data-assert` on a fieldset (and every `assert` in quizKey) resolves to an ID in the chapter doc's 断言清单 (`kp-asserts`). An unresolvable ID = 超纲 — rewrite the question before shipping, don't defer to grading time.
7. **Formatting gate (read-mode, anti wall-of-text):** every ⑤边界条件 renders as a `<ul>` of discrete cases (grep — an el-body `<p>` containing inline enumeration like `a)` is a violation); ① definitions are split into per-claim list items; every concept's ② slot holds an embedded demo (`<figure class="viz">`) or an explicit reasoned waiver.
8. **Contamination guard:** the HTML must not DEFINE any `--dsw-*` / `--dsh-*` custom properties — consuming them via `var(--dsw-alias-*, fallback)` is expected and required (theme bridge), but defining them would override the host theme. Also no `--vscode-` / `icube-theme-variables` strings — those indicate IDE/editor CSS was accidentally pasted into the file (a real incident added ~1900 junk style lines to a generated chapter). Strip or regenerate.

A failing check → do NOT ship. Re-dispatch to fix, or **degrade to markdown** (see below).

## Graceful degradation to markdown

If an HTML file repeatedly fails verification (e.g. complex quiz form keeps breaking), fall back to the OLD markdown format for that one artifact:
- Generate the `.md` version instead.
- Tell the user: "⚠️ 本次测验的 HTML 表单生成失败，已降级为 markdown 文档作答。体验略差但不影响学习。"
- The md grading path (legacy) still works.

Degradation is per-artifact, not all-or-nothing — a chapter doc can be HTML while a flaky quiz falls back to md. Never block the loop on an HTML bug.

## File locations after migration

All paths below are en logical names — map to the workspace locale per `references/naming.md` (zh: `章节/`、`测验/`、`计划/总目录.html` …) before touching disk.

```
<topic>-learning/
├── chapters/
│   ├── stage1-ch01-<slug>.html        # read-mode chapter doc (was .md)
│   └── viz/stage1-ch01-<kp>.html      # visualizations (unchanged)
├── quizzes/
│   ├── baseline.html                  # quiz-form (was baseline-assessment.md)
│   ├── stage1-ch01-quiz.html          # quiz-form (was .md)
│   ├── stage1-ch01-quiz-answers.json  # user submission (in-space: auto-saved; standalone: downloaded)
│   ├── stage1-ch01-quiz-grading.json  # AI grading record
│   ├── stage1-ch01-plan-quiz.md       # UNCHANGED — still md receipt
│   └── stage1-total-quiz.html         # quiz-form (was .md)
└── plan/
    └── master-plan.html               # read-mode (was .md)
```

Internal AI-only files (meta.json, wiki/*.md, plan/sources/*.md) **stay markdown** — the AI reads them directly, no user interaction, no benefit from HTML.
