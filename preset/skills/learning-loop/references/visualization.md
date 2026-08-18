# Visualization Protocol

The learning-loop skill generates **interactive HTML visualizations** for concepts. As of spec 2.0, visualizations are **the primary vehicle for intuition — the analogy-based 直觉解释 element has been removed**. This file defines *when* to visualize (default: always, with narrow waivers), *what makes a demo a "真正的演示"*, *how to embed*, and *how to verify* the HTML actually works. Read before any chapter generation.

## Why demos replaced analogies

An analogy ("引用像遥控器"、"对象在堆像家具在仓库") is invisible and non-operable — the user cannot watch it happen, cannot poke it, and cannot see where it breaks. That is a recurring source of 理解偏差. A demo shows the **mechanism itself**: the stack frames, the heap objects, the copies being made, the state changing step by step. The user can operate it and verify each 考点断言 with their own eyes. Intuition is built by manipulation, not by metaphor.

**Prose rule:** the chapter doc must not use analogy phrasing anywhere ("像 X"、"好比 Y"、"可以把它想象成 Z"). Restate mechanisms in plain technical language; let the demo carry the intuition.

## When to visualize — default ON, waiver only

**Every 核心概念 (KP) gets an interactive demo by default.** Expect 5–8 demos in a typical chapter. A KP may be waived ONLY if it is pure recall with nothing to operate or observe (e.g. "记住 char 的默认值是 '\u0000'" with no state, no flow, no visible behavior). Waivers must be explicit and reasoned in the `visualization_decisions` block — silence is NOT a valid waiver. If you find yourself waiving most KPs, you are under-building: find the mechanism angle (a memory grid filling with defaults IS demonstrable).

The old signal table (≥2 signals → visualize, 0–3 per chapter) is **retired as a gate**. It survives only as a **demo-type selector** — pick the interaction pattern that fits the concept:

| Concept shape | Demo pattern | Example |
|--------|---------|------|
| Stateful / multi-step | stepper: 下一步/上一步/重置 walking through states | 初始化顺序逐条执行；Promise pending→fulfilled |
| Spatial / structural | draggable/clickable structure map with highlighting | 栈帧+堆对象+引用箭头；DOM tree |
| Data-flow | animated pipeline where items move between zones on step | 实参→形参复制；git 三区流动 |
| Parameter-sensitive | slider/select that changes the outcome visibly | max-age 改新鲜期；递归深度 |
| Counter-intuitive when static | step + before/after diff view | 短路求值跳过的副作用；event loop |

```
visualization_decisions:
  KP1 (类与对象/引用): demo — pattern: structure-map (栈/堆/引用箭头, 可加对象/可断引用)
  KP2 (默认值): demo — pattern: stepper (内存槽逐个填默认值)
  KP3 (语法声明位置): waive — 纯语法记忆，无状态流转与可观察行为
  KP4 (值传递): demo — pattern: data-flow + stepper (复制/改字段/重赋值三分支)
```

## What makes a "真正的演示" (hard quality bar)

A demo that only draws a concept diagram or decorates a definition is NOT a demo — it recreates exactly the analogy problem in graphical form. Every demo MUST:

1. **Show the mechanism itself, operable.** The real entities of the concept (变量槽 / 栈帧 / 堆对象 / 引用箭头 / 缓存条目 / 指针) are drawn explicitly, and executing steps changes their visible state (color/position/value). No metaphor drawings, no static architecture charts.
2. **Cover the key branches — including a boundary case.** The demo's scenario set must include at least one case from the concept's ⑤边界条件 (e.g. a pass-by-value demo must let the user try the "对形参重新赋值 → 实参不变" branch, not only the happy path). Map each scenario to the 考点断言 it verifies and say so in the 观察要点.
3. **Let the user try their own hand.** Where feasible, offer a control that changes the outcome (choose scenario / edit a value / pick a branch), so the user can test predictions — not just watch a fixed replay.
4. **Minimum interaction floor:** a 下一步 (step) control, a 重置 control, and visible state change per step. Pure static SVG with no controls does not count — skip the viz entirely rather than shipping a static picture.
5. **Tech constraints (unchanged):** single `.html`, all CSS/JS inline, no external deps/CDN, vanilla JS, `'use strict'` + IIFE, Chinese labels matching chapter terminology, `render()`-from-state pattern, and the `reportHeight()` auto-height postMessage snippet kept verbatim (it lets the parent chapter resize the iframe — never hard-set a tiny height).

## How to embed in the chapter doc

The demo lives in the concept's **② 直观演示** element slot (inside the six-element `<ol class="elements">`), so the user reaches it at the exact moment of learning that concept — not as an appendix after ⑥. The skeleton CSS makes the figure break out to the card's full width inside the slot.

**File location:** `<workspace>/chapters/viz/stageN-chXX-<kp-slug>.html` (one file per demoed KP; `viz/` subfolder keeps them organized). The file remains double-click-openable and reusable; the iframe loads it inline.

```html
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
```

观察要点 (observe list) is mandatory whenever a demo exists: 2–3 items phrased as actions ("把 b 的赋值方式切到『重赋值』，点下一步，观察 main 里 s 指向的对象内容没变"). For waived KPs, the ② slot states the waiver and its reason ("演示豁免：纯记忆型，无状态流转") — no empty figure, no placeholder.

## Quality verification (JS 静态检查 — unchanged flow)

The main agent **must verify** every generated HTML before handing the chapter to the user. A demo that errors on open is worse than none. Verification is static, not a browser run:

1. **Syntax check:** extract the `<script>` content, run `node --check`. A syntax error means the file is broken — reject and regenerate.
2. **Element existence check:** the skeleton's required controls exist (`下一步`/step button id, `重置` id; slider/select ids if the pattern uses them).
3. **No undefined references:** every `getElementById('x')` has a matching `id="x"`; called functions are defined in the script.
4. **`reportHeight()` present:** grep for `__vizHeight` — its absence means the iframe will be clipped at default height in the chapter page.
5. **Interaction floor:** at least one button that mutates state and calls `render()`; a reset control.

If any check fails: **do not hand the broken viz to the user.** Either (a) re-dispatch the subagent with the specific failure, or (b) drop the demo for that KP and fill the ② slot with a reasoned waiver + a prose mechanism walkthrough (no analogy). Never ship a viz that errors on open.

**Why not browser-screenshot verification:** heavier and slower per chapter; static checks catch the vast majority of "won't render" failures at a fraction of the cost. Visual issues that slip through get reported and fixed.

## What the visualization subagent returns

The planner subagent generates the HTML directly (it's the same agent that knows the concept). It returns, per KP:

```
visualization_decisions:
  <per-KP decision block as above — every KP appears, demo or reasoned waiver>

viz_files_written:
  - path: <abs path>/chapters/viz/stageN-chXX-<kp-slug>.html
    kp: KP3
    concept: 值传递与引用语义
    pattern: data-flow + stepper
    branches_covered: 改字段生效 / 重赋值无效 / swap 反证（对应 KP3-A2, KP3-A3, KP3-A5）
    interaction: scenario select + step buttons + reset
    verified: <true|false — true ONLY if the subagent self-ran the static checks; main agent re-verifies anyway>
```

The main agent then runs the verification itself (don't trust the subagent's self-check alone) and either keeps or drops each viz. Note `branches_covered` — it is how the main agent spot-checks quality bar #2 (boundary-case coverage) without opening a browser.
