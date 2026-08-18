# Naming Table (语言自适应命名)

唯一权威的目录/文件名映射表。生成或读取任何文件前，先读本文件，按工作区 `meta.json` 的 `locale` 取值推导出当次的真实路径名。**en 是 canonical（技能 references 与 SKILL.md 中的逻辑名），zh 是其本地化名。**

## 铁律

1. `meta.json` 恒为 `meta.json`（状态机契约，任何语言都不变，是续学的稳定锚点）。
2. 主题 slug 恒为 ASCII（`react`、`intro`，小写连字符）；仅人读词根本地化。
3. `_vN` 版本后缀、`stageN`/`chXX` 中的数字不本地化（`_v2`、`stage1`、`ch01` 保持 ASCII；zh 下前缀改为「阶段N-章XX」）。
4. locale 在初始化时写入 `meta.json`，此后所有路径由 `locale` 决定；老工作区无 locale 一律按 `en` 推导。

## locale 取值

| locale | 含义 | 判定 |
|---|---|---|
| `zh` | 中文 | 用户最近消息以中文为主 |
| `en` | 英文 | 用户最近消息以英文为主 / 无法判定 |

## Token 映射表

| 逻辑名（en，canonical） | zh | 用途 |
|---|---|---|
| `-learning` | `-学习` | 工作区目录后缀 |
| `00-baseline` | `00-基线测评` | 基线测评目录 |
| `plan` | `计划` | 总目录/计划目录 |
| `sources` | `资料` | 章节资料卡目录（plan/ 下） |
| `chapters` | `章节` | 章节教材目录 |
| `viz` | `演示` | 交互演示目录（chapters/ 下） |
| `quizzes` | `测验` | 测验目录 |
| `wiki` | `知识库` | 学习记录目录 |
| `baseline.html` | `基线测评.html` | 基线测评（表单） |
| `baseline-answers.json` | `基线测评-答案.json` | 基线测评答案 |
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
| `stageN-chXX-<slug>-note.html` | `阶段N-章XX-<slug>-笔记.html` | 每章一个富文本笔记文件（学习空间 UI 按 chapterKey 读写） |

## 组合规则

- 文件名 = 前缀（如 `stageN-chXX`）+ 中缀（`quiz` / `wiki` / `plan-quiz` 或 `<slug>` / `<kp>`）+ 后缀（`.html` / `.json` / `.md`）。zh 下把 en 前缀/中缀换成对应 zh 词，其余（数字、slug、扩展名、`_vN`）不变。
- 测验的 answers/grading 始终与 quiz 同名同目录（仅后缀词变化），使 quiz 表单的 submit JS 下载名、restore-on-load 的 fetch 名、评分写回名三者一致。
- 工作区发现：目录名以 `naming.md` 的 workspace 后缀之一结尾（`-learning` / `-学习`）且含 `meta.json`。

## 使用

- init：探测语言 → 写 `meta.json.locale` → 建目录/文件时按本表推导真实名；初始化时一并创建 `notes`/`笔记` 目录（学习空间 UI 使用，AI 不写其中文件）。
- resume：读 `meta.json.locale` → 用本表把 en 逻辑名映射回该工作区的真实名，再 glob/read。
- 子代理：prompt 里给出「按本表 + 该工作区 locale 推导的绝对输出路径」，不要让它自己猜名字。
