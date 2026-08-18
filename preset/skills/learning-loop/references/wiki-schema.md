# Wiki Schema

The wiki is the system's memory across chapters and stages. Two layers:

1. `wiki/progress.md` — the master log, one line per chapter completion.
2. `wiki/stageN-chXX-wiki.md` — per-chapter record, the input the next-chapter planner reads.

## progress.md — append-only master log

```markdown
# 学习进度总览 — <topic>

> 每完成一个章节追加一行。最新在最下。

| 时间 | 阶段 | 章节 | 标题 | 章节测验 | 计划测验 | 合并分 | 文档版本 | 备注 |
|------|------|------|------|----------|----------|--------|----------|------|
| 2026-07-24 | 1 | 1 | intro | 0.70 | 0.90 | 0.80 | v1 | 首次通过 |

## 阶段状态
- 阶段 1（基础）：进行中（1/4 章完成）
- 阶段 2（进阶）：未开始
```

Append a row after every chapter pass. Update the 阶段状态 block at stage boundaries.

## Per-chapter wiki — `wiki/stageN-chXX-wiki.md`

This is the file the **next-chapter planner subagent** reads to adapt. Be concrete — vague notes ("needs practice") are useless to a planner; specific notes ("confuses precision with recall when X") drive adaptation.

```markdown
# Wiki — 阶段< N >·章节< XX > <title>

- 完成时间：<ts>
- 合并得分：<chapter_quiz> + <plan_quiz> → <combined>
- 文档版本：v< version >
- 尝试次数：<attempts>

## 已掌握（可假设为前置）
- <concrete concept/skill the user demonstrably has>
- …

## 仍不稳固（下一章应巩固或在测验中复探）
- <specific gap, with the misconception if any>
- …

## 观察到的具体误区
- 期望：<correct mental model>
  实际：<what the user did/thought>
  推测原因：<why they likely drifted>
- …

## 适应建议（给下一章 planner）
- 难度：<keep/step up/step down>，原因：<…>
- 下一章应在 <area> 处加 <kind of example/exercise>，因为 <…>
- 下一章测验建议侧重：<question types>，原因：<…>

## 本章节贡献的能力点
- <one-line each, e.g. "能解释梯度下降的几何直觉">
```

## What makes a wiki entry useful to the planner

Good:
> 仍不稳固：将「准确率」与「召回率」混淆；问及取舍时选了准确率但解释里说的其实是召回。
> 适应建议：下一章在引入 F1 前先用一个混淆矩阵可视化巩固 Precision/Recall；测验中加一道实战题要求从混淆矩阵算两者。

Bad (do not write this):
> 仍不稳固：评估指标掌握不牢。
> 适应建议：多练习。

The planner subagent has no other context. If the wiki is vague, the next chapter can't adapt — which defeats the loop.

## When the wiki is read

- **Next-chapter planner** reads the immediately prior chapter's wiki + scans all prior for accumulated weak spots.
- **Stage planner** reads every chapter wiki in the just-completed stage.
- **Resume** reads `progress.md` to know where the user is.

Keep both files accurate. Never edit a past wiki entry retroactively except to fix a typo — it's a record, not a draft.
