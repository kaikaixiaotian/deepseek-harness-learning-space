# Naming Table (语言自适应命名)

唯一权威的目录/文件名映射表。生成或读取任何文件前，先读本文件，按工作区 `meta.json` 的 `locale` 取值推导出当次的真实路径名。**en 是逻辑名（技能 references 与 SKILL.md 中书写的形式），zh 是其本地化名——SKILL.md 里出现的每一个 en 路径都是逻辑名，落盘前必须查本表转换。**

## 铁律

1. `meta.json` 恒为 `meta.json`（状态机契约，任何语言都不变，是续学的稳定锚点）。
2. 主题 slug 恒为 ASCII（`react`、`intro`，小写连字符）；仅人读词根本地化。
3. `_vN` 版本后缀、`stageN`/`chXX` 中的数字不本地化（`_v2`、`stage1`、`ch01` 保持 ASCII；zh 下前缀改为「阶段N-章XX」）。
4. locale 在初始化时写入 `meta.json`，此后所有路径由 `locale` 决定；老工作区无 locale 一律按 `en` 推导。

## locale 取值

| locale | 含义 | 判定（操作化） |
|---|---|---|
| `zh` | 中文 | 用户消息以中文为主（中文词汇占多数即可，混有少量英文术语也算 zh） |
| `en` | 英文 | 用户消息以英文为主 / 完全无法判定 |

## Token 映射表

| 逻辑名（en） | zh | 用途 |
|---|---|---|
| `-learning` | `-学习` | 工作区目录后缀 |
| `plan` | `计划` | 总目录/计划目录 |
| `sources` | `资料` | 章节资料卡目录（plan/ 下） |
| `chapters` | `章节` | 章节教材目录 |
| `viz` | `演示` | 交互演示目录（chapters/ 下） |
| `quizzes` | `测验` | 测验目录（基线测评也存这里 — 统一存储，无单独基线目录） |
| `wiki` | `知识库` | 学习记录目录 |
| `baseline.html` | `基线测评.html` | 基线测评（表单，位于测验目录） |
| `baseline-answers.json` | `基线测评-答案.json` | 基线测评答案（与表单同目录） |
| `master-plan.html` | `总目录.html` | 总目录（read-mode） |
| `master-plan-grading.json` | `总目录-批改.json` | 总目录适配记录 |
| `stageN-chXX-<slug>.html` | `阶段N-章XX-<slug>.html` | 章节教材（read-mode） |
| `stageN-chXX-<kp>.html` | `阶段N-章XX-<kp>.html` | 交互演示 |
| `stageN-chXX-quiz.html` | `阶段N-章XX-测验.html` | 章节测验（表单） |
| `stageN-chXX-quiz-answers.json` | `阶段N-章XX-测验-答案.json` | 章节测验答案 |
| `stageN-chXX-quiz-grading.json` | `阶段N-章XX-测验-批改.json` | 章节测验批改 |
| `stageN-chXX-plan-quiz.md` | `阶段N-章XX-计划测验.md` | 计划测验收据 |
| `stageN-total-quiz.html` | `阶段N-总测验.html` | 阶段总测验（表单） |
| `stageN-total-quiz-answers.json` | `阶段N-总测验-答案.json` | 阶段总测验答案 |
| `stageN-total-quiz-grading.json` | `阶段N-总测验-批改.json` | 阶段总测验批改 |
| `stageN-chXX-wiki.md` | `阶段N-章XX-知识.md` | 章节学习记录 |
| `progress.md` | `进度.md` | 总进度日志 |
| `stageN-chXX.md` | `阶段N-章XX.md` | 章节资料卡（plan/sources/ 下） |
| `notes` | `笔记` | 笔记目录（学习空间 UI 独占读写，AI 不写） |
| `notes/<chapterKey>-note.html` | `笔记/<chapterKey>-笔记.html` | 每章笔记（学习空间 UI 读写；chapterKey 恒为 ASCII 归一键如 `stage1-ch01-intro`，可选分支槽 `<chapterKey>-<branch>-note.html`；AI 永不创建/改名） |

## 组合规则

- 文件名 = 前缀（如 `stageN-chXX`）+ 中缀（`quiz` / `wiki` / `plan-quiz` 或 `<slug>` / `<kp>`）+ 后缀（`.html` / `.json` / `.md`）。zh 下把 en 前缀/中缀换成对应 zh 词，其余（数字、slug、扩展名、`_vN`）不变。
- 测验的 answers/grading 始终与 quiz 同名同目录（仅后缀词变化），使 quiz 表单的提交保存名（学习空间内）、restore-on-load 的读取名、评分写回名三者一致。
- 工作区发现：目录名以本表的 workspace 后缀之一结尾（`-learning` / `-学习`）且含 `meta.json`——**两个后缀都要 glob**。

## 使用（好/坏对照）

- init：探测语言 → 写 `meta.json.locale` → 建目录/文件时按本表推导真实名；初始化时一并创建 `notes`/`笔记` 目录（学习空间 UI 使用，AI 不写其中文件）。
- resume：读 `meta.json.locale` → 用本表把 en 逻辑名映射回该工作区的真实名，再 glob/read。
- 子代理：prompt 里给出「按本表 + 该工作区 locale 推导的绝对输出路径」，不要让它自己猜名字。

**zh 工作区对照示例（locale: "zh"）：**

| 动作 | ✅ 正确 | ❌ 错误（照抄了 en 逻辑名） |
|---|---|---|
| 建第 1 章教材 | write `react-学习/章节/阶段1-章01-入门.html` | write `react-学习/chapters/stage1-ch01-intro.html` |
| 读章节测验答案 | read `react-学习/测验/阶段1-章01-测验-答案.json` | read `react-学习/quizzes/stage1-ch01-quiz-answers.json` |
| 写章节知识记录 | write `react-学习/知识库/阶段1-章01-知识.md` | write `react-学习/wiki/stage1-ch01-wiki.md` |
| 重建 v2 | write `章节/阶段1-章01-入门_v2.html`（数字与 `_v2` 不本地化） | 把「阶段1」写成「阶段一」 |
| en 工作区同理反向 | write `react-learning/chapters/stage1-ch01-intro.html` | write `react-learning/章节/阶段1-章01.html` |
