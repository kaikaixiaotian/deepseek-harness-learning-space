# Web Research Protocol

The learning-loop skill augments its generated content with **real data from authoritative web sources**. This file defines *where* to fetch from, *how* to verify authenticity, and *what to do when the network is unavailable*. Read this before any web-research subagent dispatch, and before generating any stage-total quiz.

> **DSH dispatch note**: dispatch this research as a `subagent` whose prompt instructs it to use the DSH `web_search` tool (and `web_fetch` to read page bodies from whitelist URLs). The subagent inherits the session's tools. Everything else in this file — whitelist, three gates, degradation, citation format — is unchanged.

## Why web data at all

Pure AI-generated quizzes risk two failure modes the user explicitly flagged:
1. **Insufficient volume** — a chapter quiz with 6 questions is fine, but a stage-total covering 4–6 chapters needs 12–18 questions; AI generating them from memory drifts toward repetitive, low-quality items.
2. **Factual drift** — AI can confidently state things that are subtly wrong (deprecated APIs, misremembered defaults, invented function signatures). Real docs anchor the quiz to ground truth.

Web research fixes both — but only if the sources are trustworthy. So the policy is **strict**.

## Whitelist of authoritative sources (白名单)

Only fetch from these categories. Anything outside the whitelist requires explicit user approval first.

| Category | Examples | When to use |
|----------|----------|-------------|
| **Official documentation** | react.dev, kubernetes.io, docs.python.org, rust-lang.org, MDN (developer.mozilla.org), Go's pkg.go.dev | APIs, defaults, idioms, current behavior |
| **Official RFCs / standards** | datatracker.ietf.org (RFCs), w3.org, ecma-international.org | Language semantics, protocol behavior |
| **Language/tool reference** | git-scm.com/doc, linux.die.net/man, GNU info pages | Command flags, exact syntax |
| **Authoritative tutorials by maintainers** | The official "tutorial" / "learn" subdomain of the above | When the topic itself is a tutorialized feature |
| **Peer-reviewed / canonical texts** | ACM Digital Library (abstracts), arxiv (for ML/CS theory, cite the abstract + DOI) | Algorithm/theory topics |
| **Primary source repos** | The GitHub repo of the tool itself (issues, README, docs/ folder) | Gotchas, real bugs, deprecation notices |

**Excluded (require approval, treated as unverified even if used):**
- Medium / Dev.to / personal blogs — useful for intuition, NOT for facts. May inform question framing but every factual claim still needs an official-source citation.
- Stack Overflow — same as blogs. Acceptable to *find* an answer, but you must trace the claim back to the official doc before using it as quiz ground truth.
- AI-generated content farms (geeksforgeeks, tutorialspoint, etc.) — error-prone, avoid.
- Social media, videos without transcripts.

The research subagent **must record the source URL** for every fact it returns. Uncited facts are treated as unverified and discarded.

## How to verify authenticity (真实性保障)

Three gates, in order. A fact must pass all three to be used as quiz ground truth:

1. **Source gate** — comes from the whitelist above. Record the exact URL.
2. **Recency gate** — check the doc's "last updated" / version. If the topic moves fast (a JS framework, a cloud service), prefer docs updated within the last 18 months. If you can't tell, mark it `recency:unknown` and treat with caution.
3. **Corroboration gate** — for any *behavioral* claim (not pure definitions), require **≥1 official source** OR **≥2 independent sources** where at least one is whitelist-grade. Pure definitions from the official doc need no second source.

When the subagent returns research, it must attach a `sources:` block:

```
sources:
  - url: https://react.dev/reference/react/useState
    type: official-doc
    accessed: 2026-07-27
    recency: 2026-06 (current as of React 19)
  - url: https://github.com/facebook/react/issues/12345
    type: primary-source-repo
    accessed: 2026-07-27
    used_for: the gotcha about stale closures in Q7
```

## Where web research plugs in

Per the user's confirmed scope:

| Stage | Web research? | Why |
|-------|---------------|-----|
| Baseline assessment | ❌ no | It's about the user's prior knowledge, not external facts. |
| Master plan + chapter docs | ⚪ optional (chapter planner subagent may fetch to strengthen examples) | Improves quality but not required; chapter quizzes stay small and AI-generated. |
| Chapter quiz | ❌ no | Small (6–10 Q), single-chapter scope; AI generation is adequate. |
| Plan-quiz | ❌ no | Live, adaptive; can't pre-research. |
| **Stage-total quiz** | ✅ **mandatory** | Covers 4–6 chapters, needs 12–18 high-quality questions — this is exactly where AI-alone drifts. Must fetch real material. |
| **Chapter rebuild (v2/v3)** | ✅ encouraged | When the user fails, fetching an authoritative explanation of the misconception beats rewording the same AI explanation. |

## Graceful degradation (优雅降级)

The web-research subagent MUST handle failure without blocking the loop. On any failure path below, do **not** abort the stage-total — instead, degrade and mark clearly:

| Failure | Action |
|---------|--------|
| Network unreachable / timeout | Skip web research; generate stage-total from AI alone. Add a banner: `> ⚠️ 本测验未经过外部数据增强（网络不可达）。事实准确性可能低于正常水平，遇到可疑题目请核对官方文档。` |
| Whitelist sources return nothing for the topic | Try one tier lower (reputable blog) with explicit `corroboration: blog, unverified` tag on each affected question. Same banner. |
| Some questions researched, some not | Mark per-question: questions with a source get `[出处: url]`; questions without get `[未验证]`. Don't blanket-mark the whole quiz. |
| Fetched content contradicts AI's prior knowledge | **Trust the official source.** Update the chapter doc's misconception in the wiki. Never silently override real docs with AI memory. |

The degradation banner and per-question tags are non-negotiable — they tell the user (and you, on resume) exactly how much to trust each item.

## Per-question citation format

Every stage-total question that used web research must show its source, inline, in this exact format (half-width brackets, matches the point-notation style):

```
3. (实战题, 5分) 给定一个 React 组件……（基于 useState 的真实行为） [出处: https://react.dev/reference/react/useState]
```

Questions with no source (degraded path) get:
```
4. (实战题, 5分) …… [未验证]
```

This way the user can click through to verify, and the grader knows which items have ground-truth backing.

## What the research subagent returns

A research subagent does NOT write the quiz itself. It returns a structured brief that the stage-total planner then composes into questions. Format:

```
TOPIC: <stage topic, e.g. "React Hooks (阶段2)">
REQUESTED SCOPE: <which chapters, which concepts>

FINDINGS:
## Concept: useState
- Fact: 调用 useState 返回 [当前值, setter]，setter 接受新值或更新函数。 [出处: url1]
- Fact: 更新函数形式 setState(prev => prev+1) 在多次快速更新时是安全的；直接 setState(prev+1) 在批量更新下会丢失更新。 [出处: url1, url2]
- Gotcha: 闭包陷阱（stale closure）—— useEffect 中读到的 state 可能是定义时的快照而非最新。 [出处: github issue, 官方 FAQ]
- Recency note: 以上为 React 19 文档，2026-06 更新。

## Concept: useEffect
- …
（每个章节的概念都覆盖）

DEGRADATION NOTES:
- <哪些概念没找到权威源，标记 unverified>
- <如果有降级，说明降级到哪一层>
```

The planner subagent then turns each "Fact" / "Gotcha" into a question, preserving the citation. Facts without citations are dropped (not silently used).
